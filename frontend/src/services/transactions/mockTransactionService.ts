import { ApiError, DEFAULT_ERROR_MESSAGES, type FieldError } from '@/core/errors'
import { notFound, validationError } from '@/core/mock/mockRuntime'
import { transactionReconciliationStatus } from '@/domain/finance'
import type { BankTransaction, BankTransactionView, ImportBatch } from '@/domain'
import type { UploadedFile } from '../invoices/InvoiceService'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  includesText,
  isTransactionVisible,
  paginate,
  requirePermission,
} from '../mock/access'
import { MAX_CSV_SIZE_BYTES, parseBankCsv } from './csvParser'
import type { TransactionService } from './TransactionService'

function invalidFile(details: FieldError[], operation = 'imports.transactionsCsv'): ApiError {
  return new ApiError({
    code: 'INVALID_FILE',
    status: 422,
    message: DEFAULT_ERROR_MESSAGES.INVALID_FILE,
    details,
    operation,
  })
}

/** Contrôles communs à l'aperçu et à l'import : type, taille, puis parsing ligne par ligne. */
function checkCsv(file: UploadedFile, text: string, operation: string) {
  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
  if (!isCsv)
    throw invalidFile(
      [{ field: 'file', message: 'Le fichier doit être un CSV (.csv).' }],
      operation,
    )
  if (file.size > MAX_CSV_SIZE_BYTES)
    throw invalidFile([{ field: 'file', message: 'Le fichier dépasse 1 Mo.' }], operation)
  const { rows, errors } = parseBankCsv(text)
  if (errors.length > 0) throw invalidFile(errors, operation)
  return rows
}

export function createMockTransactionService(ctx: MockContext): TransactionService {
  const { runtime } = ctx

  function toView(tx: BankTransaction): BankTransactionView {
    const reconciliationStatus = transactionReconciliationStatus(tx.id, ctx.db.reconciliations)
    return {
      ...tx,
      reconciliationStatus,
      missingReceipt: tx.direction === 'debit' && reconciliationStatus !== 'matched',
    }
  }

  function visibleViews(operation: string, entityId?: string): BankTransactionView[] {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'transactions:read', operation)
    if (entityId) assertEntityAccess(ctx, user, entityId, operation)
    return ctx.db.transactions
      .filter((t) => isTransactionVisible(ctx, user, t))
      .filter((t) => !entityId || t.entityId === entityId)
      .map(toView)
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || a.id.localeCompare(b.id))
  }

  return {
    listTransactions: (query = {}) =>
      runtime.run('transactions.list', () => {
        const items = visibleViews('transactions.list', query.entityId)
          .filter((t) => !query.bankAccountId || t.bankAccountId === query.bankAccountId)
          .filter((t) => !query.cardId || t.cardId === query.cardId)
          .filter((t) => !query.categoryId || t.categoryId === query.categoryId)
          .filter(
            (t) =>
              !query.holderUserId ||
              ctx.db.cards.some((c) => c.id === t.cardId && c.holderUserId === query.holderUserId),
          )
          .filter((t) => !query.direction || t.direction === query.direction)
          .filter(
            (t) =>
              !query.reconciliationStatus || t.reconciliationStatus === query.reconciliationStatus,
          )
          .filter(
            (t) => query.missingReceipt === undefined || t.missingReceipt === query.missingReceipt,
          )
          .filter((t) => !query.bookedFrom || t.bookingDate >= query.bookedFrom)
          .filter((t) => !query.bookedTo || t.bookingDate <= query.bookedTo)
          .filter((t) => includesText([t.label, t.counterpartyName], query.search))
        return paginate(items, query)
      }),

    getTransaction: (id) =>
      runtime.run('transactions.get', () => {
        const view = visibleViews('transactions.get').find((t) => t.id === id)
        if (!view) throw notFound('transactions.get', 'Transaction')
        return view
      }),

    updateTransactionCategory: (id, categoryId) =>
      runtime.run('transactions.updateCategory', () => {
        const op = 'transactions.updateCategory'
        const user = currentUser(ctx, op)
        requirePermission(user, 'transactions:write', op)
        const tx = ctx.db.transactions.find((t) => t.id === id)
        if (!tx || !isTransactionVisible(ctx, user, tx)) throw notFound(op, 'Transaction')
        if (categoryId && !ctx.db.categories.some((c) => c.id === categoryId)) {
          throw validationError(op, 'categoryId', 'Catégorie inconnue.')
        }
        tx.categoryId = categoryId
        tx.categoryProvenance = categoryId ? 'user_corrected' : null
        return toView(tx)
      }),

    listMissingReceipts: (query = {}) =>
      runtime.run('transactions.listMissingReceipts', () =>
        visibleViews('transactions.listMissingReceipts', query.entityId).filter(
          (t) => t.missingReceipt,
        ),
      ),

    listBankAccounts: () =>
      runtime.run('transactions.listBankAccounts', () => {
        const ids = accessibleEntityIds(ctx, currentUser(ctx, 'transactions.listBankAccounts'))
        return ctx.db.bankAccounts.filter((a) => ids.has(a.entityId))
      }),

    listImportBatches: () =>
      runtime.run('transactions.listImportBatches', () => {
        const ids = accessibleEntityIds(ctx, currentUser(ctx, 'transactions.listImportBatches'))
        return ctx.db.importBatches.filter((b) => ids.has(b.entityId))
      }),

    async importCsv(bankAccountId, file) {
      const text = new TextDecoder('utf-8').decode(await file.arrayBuffer())
      return runtime.run('imports.transactionsCsv', () => {
        const user = currentUser(ctx, 'imports.transactionsCsv')
        requirePermission(user, 'transactions:import', 'imports.transactionsCsv')
        const account = ctx.db.bankAccounts.find((a) => a.id === bankAccountId)
        if (!account) throw notFound('imports.transactionsCsv', 'Compte bancaire')
        assertEntityAccess(ctx, user, account.entityId, 'imports.transactionsCsv')

        const rows = checkCsv(file, text, 'imports.transactionsCsv')

        const batch: ImportBatch = {
          id: ctx.nextId('batch'),
          entityId: account.entityId,
          bankAccountId,
          fileName: file.name,
          importedAt: ctx.now(),
          importedByUserId: user.id,
          rowCount: rows.length,
        }
        const categoryByCode = new Map(ctx.db.categories.map((c) => [c.code, c.id]))
        const transactions: BankTransaction[] = rows.map((r) => {
          const categoryId = (r.categoryCode && categoryByCode.get(r.categoryCode)) || null
          return {
            id: ctx.nextId('tx'),
            entityId: account.entityId,
            bankAccountId,
            bookingDate: r.date,
            label: r.label,
            counterpartyName: r.counterparty,
            amountCents: r.amountCents,
            direction: r.direction,
            currency: 'EUR',
            source: 'csv_import',
            cardId: null,
            categoryId,
            categoryProvenance: categoryId ? 'recorded' : null,
            importBatchId: batch.id,
          }
        })
        ctx.db.importBatches.push(batch)
        ctx.db.transactions.push(...transactions)
        return { batch, transactions }
      })
    },

    async previewCsv(file) {
      const text = new TextDecoder('utf-8').decode(await file.arrayBuffer())
      return runtime.run('imports.transactionsCsvPreview', () => {
        const op = 'imports.transactionsCsvPreview'
        requirePermission(currentUser(ctx, op), 'transactions:import', op)
        const rows = checkCsv(file, text, op)
        return {
          fileName: file.name,
          rows: rows.map((r) => ({
            line: r.line,
            bookingDate: r.date,
            label: r.label,
            counterpartyName: r.counterparty,
            amountCents: r.amountCents,
            direction: r.direction,
            categoryCode: r.categoryCode,
          })),
        }
      })
    },
  }
}
