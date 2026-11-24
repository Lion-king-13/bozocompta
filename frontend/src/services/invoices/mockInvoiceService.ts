import { ApiError, DEFAULT_ERROR_MESSAGES } from '@/core/errors'
import { notFound, validationError } from '@/core/mock/mockRuntime'
import { computeInvoiceLine, computeInvoiceTotals } from '@/domain/finance'
import type { DataProvenance, Invoice, InvoiceDraft, InvoiceInput, InvoiceQuery } from '@/domain'
import { assertAiQuota, recordAiUsage } from '../mock/aiQuota'
import type { MockContext } from '../mock/context'
import {
  assertEntityAccess,
  currentUser,
  includesText,
  isInvoiceVisible,
  paginate,
  requirePermission,
} from '../mock/access'
import type { InvoiceService } from './InvoiceService'
import { checkPdfFile } from './pdfCheck'

const EXTRACTION_TOKENS = 3_200

function validateInput(operation: string, input: InvoiceInput): void {
  if (!input.number.trim())
    throw validationError(operation, 'number', 'Le numéro de facture est requis.')
  if (input.lines.length === 0)
    throw validationError(operation, 'lines', 'Au moins une ligne est requise.')
  input.lines.forEach((l, i) => {
    if (!Number.isSafeInteger(l.quantity) || l.quantity <= 0)
      throw validationError(operation, `lines.${i}.quantity`, 'Quantité entière positive requise.')
    if (!Number.isSafeInteger(l.unitPriceCents) || l.unitPriceCents < 0)
      throw validationError(
        operation,
        `lines.${i}.unitPriceCents`,
        'Prix unitaire invalide (centimes, positif).',
      )
  })
  if (input.dueDate < input.issueDate)
    throw validationError(operation, 'dueDate', "L'échéance doit suivre la date d'émission.")
}

function applyInput(invoice: Invoice, input: InvoiceInput, provenance: DataProvenance): void {
  const lines = input.lines.map((l, i) =>
    computeInvoiceLine(`${invoice.id}-l${i + 1}`, l, provenance),
  )
  Object.assign(invoice, {
    entityId: input.entityId,
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    number: input.number.trim(),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    lines,
    ...computeInvoiceTotals(lines),
    provenance,
  })
}

/** Tri demandé (défaut : date d'émission décroissante). */
function compareInvoices(a: Invoice, b: Invoice, query: InvoiceQuery): number {
  const key = query.sortBy ?? 'issueDate'
  const direction = query.sortDirection ?? (query.sortBy ? 'asc' : 'desc')
  const result =
    key === 'totalInclVatCents' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]))
  return direction === 'asc' ? result : -result
}

/** Extraction SIMULÉE et déterministe : renvoie toujours le contenu de la facture de démo. */
function simulatedDraft(id: string, fileName: string): InvoiceDraft {
  const ai = <T>(value: T, confidenceBp: number) => ({
    value,
    provenance: 'ai_extracted' as const,
    confidenceBp,
  })
  return {
    id,
    fileName,
    supplierName: ai('Bureau & Co', 9600),
    supplierId: ai('sup-bureau', 9100),
    number: ai('BC-56010', 9800),
    issueDate: ai('2026-11-18', 9500),
    dueDate: ai('2026-12-18', 8700),
    totalExclVatCents: ai(4_500, 9400),
    vatCents: ai(945, 9400),
    totalInclVatCents: ai(5_445, 9700),
    categoryId: { value: 'cat-office', provenance: 'ai_suggested', confidenceBp: 8200 },
    lines: [
      { description: ai('Classeurs à levier (x10)', 9000), totalExclVatCents: ai(4_500, 9300) },
    ],
    tokensUsed: EXTRACTION_TOKENS,
    simulated: true,
  }
}

export function createMockInvoiceService(ctx: MockContext): InvoiceService {
  const { runtime } = ctx

  function findVisible(id: string, operation: string): Invoice {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'invoices:read', operation)
    const invoice = ctx.db.invoices.find((i) => i.id === id)
    if (!invoice || !isInvoiceVisible(ctx, user, invoice)) throw notFound(operation, 'Facture')
    return invoice
  }

  return {
    listInvoices: (query = {}) =>
      runtime.run('invoices.list', () => {
        const user = currentUser(ctx, 'invoices.list')
        requirePermission(user, 'invoices:read', 'invoices.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'invoices.list')
        const supplierName = new Map(ctx.db.suppliers.map((s) => [s.id, s.name]))
        const items = ctx.db.invoices
          .filter((i) => isInvoiceVisible(ctx, user, i))
          .filter((i) => !query.entityId || i.entityId === query.entityId)
          .filter((i) => !query.supplierId || i.supplierId === query.supplierId)
          .filter((i) => !query.categoryId || i.categoryId === query.categoryId)
          .filter((i) => !query.status || i.status === query.status)
          .filter((i) => !query.issuedFrom || i.issueDate >= query.issuedFrom)
          .filter((i) => !query.issuedTo || i.issueDate <= query.issuedTo)
          .filter((i) => includesText([i.number, supplierName.get(i.supplierId)], query.search))
          .sort((a, b) => compareInvoices(a, b, query) || a.id.localeCompare(b.id))
        return paginate(items, query)
      }),

    getInvoice: (id) => runtime.run('invoices.get', () => findVisible(id, 'invoices.get')),

    updateInvoice: (id, input) =>
      runtime.run('invoices.update', () => {
        const invoice = findVisible(id, 'invoices.update')
        const user = currentUser(ctx, 'invoices.update')
        requirePermission(user, 'invoices:write', 'invoices.update')
        assertEntityAccess(ctx, user, input.entityId, 'invoices.update')
        validateInput('invoices.update', input)
        applyInput(invoice, input, 'user_corrected')
        return invoice
      }),

    validateInvoice: (id) =>
      runtime.run('invoices.validate', () => {
        const invoice = findVisible(id, 'invoices.validate')
        requirePermission(
          currentUser(ctx, 'invoices.validate'),
          'invoices:write',
          'invoices.validate',
        )
        if (invoice.status === 'cancelled' || invoice.status === 'paid') {
          throw validationError(
            'invoices.validate',
            'status',
            'Cette facture ne peut plus être validée.',
          )
        }
        invoice.status = 'approved'
        invoice.provenance = 'recorded'
        invoice.lines.forEach((l) => (l.provenance = 'recorded'))
        return invoice
      }),

    async importInvoicePdf(file) {
      // Lecture des premiers octets (hors runtime : c'est le navigateur qui lit le fichier).
      const header = new Uint8Array((await file.arrayBuffer()).slice(0, 8))
      // Étape 1 — contrôle RÉEL du fichier (erreur n°1 « fichier invalide »).
      await runtime.run('imports.invoicePdf', () => {
        const user = currentUser(ctx, 'imports.invoicePdf')
        requirePermission(user, 'invoices:import', 'imports.invoicePdf')
        const problems = checkPdfFile(file, header)
        if (problems.length > 0) {
          throw new ApiError({
            code: 'INVALID_FILE',
            status: 422,
            message: DEFAULT_ERROR_MESSAGES.INVALID_FILE,
            details: problems,
            operation: 'imports.invoicePdf',
          })
        }
      })
      // Étape 2 — extraction IA SIMULÉE (erreurs n°2 et n°3 possibles).
      return runtime.run('ai.extractInvoice', () => {
        const user = currentUser(ctx, 'ai.extractInvoice')
        assertAiQuota(ctx, user, EXTRACTION_TOKENS, 'ai.extractInvoice')
        const draft = simulatedDraft(ctx.nextId('draft'), file.name)
        ctx.db.invoiceDrafts.push(draft)
        // Consommation enregistrée seulement après succès.
        recordAiUsage(ctx, user, 'invoice_extraction', draft.tokensUsed)
        return draft
      })
    },

    confirmDraft: (draftId, input) =>
      runtime.run('invoices.confirmDraft', () => {
        const user = currentUser(ctx, 'invoices.confirmDraft')
        requirePermission(user, 'invoices:import', 'invoices.confirmDraft')
        const index = ctx.db.invoiceDrafts.findIndex((d) => d.id === draftId)
        if (index < 0) throw notFound('invoices.confirmDraft', 'Brouillon')
        assertEntityAccess(ctx, user, input.entityId, 'invoices.confirmDraft')
        validateInput('invoices.confirmDraft', input)
        const draft = ctx.db.invoiceDrafts[index] as InvoiceDraft
        const invoice: Invoice = {
          id: ctx.nextId('inv'),
          organizationId: user.organizationId,
          entityId: input.entityId,
          supplierId: input.supplierId,
          categoryId: input.categoryId,
          number: '',
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency: 'EUR',
          status: 'approved',
          lines: [],
          totalExclVatCents: 0,
          vatCents: 0,
          totalInclVatCents: 0,
          provenance: 'recorded',
          sourceDocument: {
            fileName: draft.fileName,
            url: `/mock-documents/${draft.id}.pdf`,
            sizeBytes: 0,
            uploadedAt: ctx.now(),
          },
          createdAt: ctx.now(),
        }
        applyInput(invoice, input, 'recorded')
        ctx.db.invoices.push(invoice)
        ctx.db.invoiceDrafts.splice(index, 1)
        return invoice
      }),
  }
}
