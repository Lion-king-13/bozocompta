import { conflict, notFound, validationError } from '@/core/mock/mockRuntime'
import { suggestMatches } from '@/domain/finance'
import type { Reconciliation } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  assertEntityAccess,
  currentUser,
  isInvoiceVisible,
  isTransactionVisible,
  requirePermission,
  transactionConcernsEntity,
} from '../mock/access'
import type { ReconciliationService } from './ReconciliationService'

export function createMockReconciliationService(ctx: MockContext): ReconciliationService {
  const { runtime } = ctx

  function visible(operation: string): Reconciliation[] {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'reconciliations:read', operation)
    return ctx.db.reconciliations.filter((r) => {
      const tx = ctx.db.transactions.find((t) => t.id === r.transactionId)
      return !!tx && isTransactionVisible(ctx, user, tx)
    })
  }

  /** 1 ↔ 1 : ni la facture ni la transaction ne doivent déjà avoir un rapprochement confirmé. */
  function assertFree(
    operation: string,
    invoiceId: string,
    transactionId: string,
    exceptId?: string,
  ) {
    const taken = ctx.db.reconciliations.some(
      (r) =>
        r.id !== exceptId &&
        r.status === 'confirmed' &&
        (r.invoiceId === invoiceId || r.transactionId === transactionId),
    )
    if (taken) throw conflict(operation, 'Cette facture ou cette transaction est déjà rapprochée.')
  }

  /** QA-11 : la facture dont le paiement est confirmé passe à « payée » (date = transaction). */
  function markInvoicePaid(operation: string, invoiceId: string, transactionId: string) {
    const invoice = ctx.db.invoices.find((i) => i.id === invoiceId)
    const tx = ctx.db.transactions.find((t) => t.id === transactionId)
    if (!invoice || !tx) throw notFound(operation, 'Facture ou transaction')
    if (invoice.status === 'cancelled') throw conflict(operation, 'Cette facture est annulée.')
    invoice.status = 'paid'
    invoice.paidAt = tx.bookingDate
  }

  /**
   * Préconditions d'un rapprochement confirmé (QA-30, QA-31) :
   * - seule une facture VALIDÉE (`approved`) peut être rapprochée : une facture à vérifier,
   *   contestée, annulée ou déjà payée est refusée (`CONFLICT`), pour ne jamais figer en
   *   « payée » des données extraites par l'IA et jamais relues ;
   * - le paiement doit être un débit : un encaissement ne paie pas une facture (`VALIDATION_ERROR`).
   */
  function assertReconcilable(operation: string, invoiceId: string, transactionId: string) {
    const invoice = ctx.db.invoices.find((i) => i.id === invoiceId)
    const tx = ctx.db.transactions.find((t) => t.id === transactionId)
    if (tx && tx.direction !== 'debit') {
      throw validationError(
        operation,
        'transactionId',
        'Seul un paiement (débit) peut être rapproché d’une facture.',
      )
    }
    if (invoice && invoice.status !== 'approved') {
      throw conflict(
        operation,
        invoice.status === 'paid'
          ? 'Cette facture est déjà payée.'
          : 'Validez d’abord la facture : seule une facture validée peut être rapprochée.',
      )
    }
  }

  function decide(
    id: string,
    status: 'confirmed' | 'rejected',
    operation: string,
    reason?: string,
  ): Reconciliation {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'reconciliations:validate', operation)
    const rec = visible(operation).find((r) => r.id === id)
    if (!rec) throw notFound(operation, 'Rapprochement')
    const target = ctx.db.reconciliations.find((r) => r.id === id) as Reconciliation
    if (target.status !== 'suggested')
      throw conflict(operation, 'Ce rapprochement a déjà été traité.')
    if (status === 'confirmed') {
      assertReconcilable(operation, target.invoiceId, target.transactionId)
      assertFree(operation, target.invoiceId, target.transactionId, target.id)
      markInvoicePaid(operation, target.invoiceId, target.transactionId)
    }
    Object.assign(target, {
      status,
      decidedAt: ctx.now(),
      decidedByUserId: user.id,
      rejectionReason: status === 'rejected' ? reason?.trim() || null : null,
    })
    return target
  }

  return {
    listReconciliations: (query = {}) =>
      runtime.run('reconciliations.list', () => {
        const user = currentUser(ctx, 'reconciliations.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'reconciliations.list')
        return visible('reconciliations.list')
          .filter((r) => !query.status || r.status === query.status)
          .filter((r) => {
            if (!query.entityId) return true
            const tx = ctx.db.transactions.find((t) => t.id === r.transactionId)
            return !!tx && transactionConcernsEntity(ctx, tx, query.entityId)
          })
      }),

    suggestReconciliations: () =>
      runtime.run('ai.suggestReconciliations', () => {
        const user = currentUser(ctx, 'ai.suggestReconciliations')
        requirePermission(user, 'reconciliations:read', 'ai.suggestReconciliations')
        const invoices = ctx.db.invoices.filter((i) => isInvoiceVisible(ctx, user, i))
        const transactions = ctx.db.transactions.filter((t) => isTransactionVisible(ctx, user, t))
        const names = new Map(ctx.db.suppliers.map((s) => [s.id, s.name]))
        const created = suggestMatches(invoices, transactions, ctx.db.reconciliations, names).map(
          (c): Reconciliation => ({
            id: ctx.nextId('rec'),
            invoiceId: c.invoiceId,
            transactionId: c.transactionId,
            status: 'suggested',
            origin: 'ai_suggestion',
            confidenceBp: c.scoreBp,
            matchReasons: c.reasons,
            amountDifferenceCents: c.amountDifferenceCents,
            suggestedAt: ctx.now(),
            decidedAt: null,
            decidedByUserId: null,
            rejectionReason: null,
          }),
        )
        ctx.db.reconciliations.push(...created)
        return created
      }),

    confirmReconciliation: (id) =>
      runtime.run('reconciliations.confirm', () =>
        decide(id, 'confirmed', 'reconciliations.confirm'),
      ),
    rejectReconciliation: (id, reason) =>
      runtime.run('reconciliations.reject', () =>
        decide(id, 'rejected', 'reconciliations.reject', reason),
      ),

    createManualReconciliation: (invoiceId, transactionId) =>
      runtime.run('reconciliations.createManual', () => {
        const op = 'reconciliations.createManual'
        const user = currentUser(ctx, op)
        requirePermission(user, 'reconciliations:validate', op)
        const invoice = ctx.db.invoices.find(
          (i) => i.id === invoiceId && isInvoiceVisible(ctx, user, i),
        )
        const tx = ctx.db.transactions.find(
          (t) => t.id === transactionId && isTransactionVisible(ctx, user, t),
        )
        if (!invoice) throw notFound(op, 'Facture')
        if (!tx) throw notFound(op, 'Transaction')
        assertReconcilable(op, invoiceId, transactionId)
        assertFree(op, invoiceId, transactionId)
        markInvoicePaid(op, invoiceId, transactionId)
        const rec: Reconciliation = {
          id: ctx.nextId('rec'),
          invoiceId,
          transactionId,
          status: 'confirmed',
          origin: 'manual',
          confidenceBp: null,
          matchReasons: ['Rapprochement manuel'],
          amountDifferenceCents: tx.amountCents - invoice.totalInclVatCents,
          suggestedAt: ctx.now(),
          decidedAt: ctx.now(),
          decidedByUserId: user.id,
          rejectionReason: null,
        }
        ctx.db.reconciliations.push(rec)
        return rec
      }),
  }
}
