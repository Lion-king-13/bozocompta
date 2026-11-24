import { conflict, notFound } from '@/core/mock/mockRuntime'
import { suggestMatches } from '@/domain/finance'
import type { Reconciliation } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  assertEntityAccess,
  currentUser,
  isInvoiceVisible,
  isTransactionVisible,
  requirePermission,
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

  function decide(id: string, status: 'confirmed' | 'rejected', operation: string): Reconciliation {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'reconciliations:validate', operation)
    const rec = visible(operation).find((r) => r.id === id)
    if (!rec) throw notFound(operation, 'Rapprochement')
    const target = ctx.db.reconciliations.find((r) => r.id === id) as Reconciliation
    if (target.status !== 'suggested')
      throw conflict(operation, 'Ce rapprochement a déjà été traité.')
    if (status === 'confirmed')
      assertFree(operation, target.invoiceId, target.transactionId, target.id)
    Object.assign(target, { status, decidedAt: ctx.now(), decidedByUserId: user.id })
    return target
  }

  return {
    listReconciliations: (query = {}) =>
      runtime.run('reconciliations.list', () => {
        const user = currentUser(ctx, 'reconciliations.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'reconciliations.list')
        return visible('reconciliations.list')
          .filter((r) => !query.status || r.status === query.status)
          .filter(
            (r) =>
              !query.entityId ||
              ctx.db.transactions.find((t) => t.id === r.transactionId)?.entityId ===
                query.entityId,
          )
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
          }),
        )
        ctx.db.reconciliations.push(...created)
        return created
      }),

    confirmReconciliation: (id) =>
      runtime.run('reconciliations.confirm', () =>
        decide(id, 'confirmed', 'reconciliations.confirm'),
      ),
    rejectReconciliation: (id) =>
      runtime.run('reconciliations.reject', () => decide(id, 'rejected', 'reconciliations.reject')),

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
        assertFree(op, invoiceId, transactionId)
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
        }
        ctx.db.reconciliations.push(rec)
        return rec
      }),
  }
}
