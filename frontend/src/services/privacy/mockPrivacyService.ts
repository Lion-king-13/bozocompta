import type { DeletionRequest } from '@/domain'
import type { MockContext } from '../mock/context'
import { currentUser, requirePermission } from '../mock/access'
import type { PrivacyService } from './PrivacyService'

export function createMockPrivacyService(ctx: MockContext): PrivacyService {
  return {
    exportMyData: () =>
      ctx.runtime.run('privacy.export', () => {
        const user = currentUser(ctx, 'privacy.export')
        requirePermission(user, 'privacy:self', 'privacy.export')
        const cards = ctx.db.cards.filter((c) => c.holderUserId === user.id)
        const cardIds = new Set(cards.map((c) => c.id))
        const content = JSON.stringify(
          {
            generatedAt: ctx.now(),
            notice: 'Export de démonstration (données fictives).',
            profile: user,
            cards,
            cardTransactions: ctx.db.transactions.filter((t) => t.cardId && cardIds.has(t.cardId)),
            aiUsage: ctx.db.aiUsage.filter((r) => r.userId === user.id),
          },
          null,
          2,
        )
        const result = {
          id: ctx.nextId('export'),
          requestedAt: ctx.now(),
          requestedByUserId: user.id,
          fileName: `cashlens-export-${user.id}.json`,
          content,
        }
        ctx.db.dataExports.push(result)
        return result
      }),

    requestDeletion: (scope) =>
      ctx.runtime.run('privacy.requestDeletion', () => {
        const user = currentUser(ctx, 'privacy.requestDeletion')
        requirePermission(
          user,
          scope === 'organization' ? 'privacy:organization' : 'privacy:self',
          'privacy.requestDeletion',
        )
        const request: DeletionRequest = {
          id: ctx.nextId('del'),
          scope,
          status: 'completed',
          requestedAt: ctx.now(),
          requestedByUserId: user.id,
        }
        const db = ctx.db
        if (scope === 'my_account') {
          db.users = db.users.filter((u) => u.id !== user.id)
          db.cards.filter((c) => c.holderUserId === user.id).forEach((c) => (c.status = 'blocked'))
          db.aiUsage = db.aiUsage.filter((r) => r.userId !== user.id)
          ctx.session.userId = null
        } else {
          const entities = new Set(
            db.entities.filter((e) => e.organizationId === user.organizationId).map((e) => e.id),
          )
          const txIds = new Set(
            db.transactions.filter((t) => entities.has(t.entityId)).map((t) => t.id),
          )
          db.transactions = db.transactions.filter((t) => !txIds.has(t.id))
          db.allocations = db.allocations.filter((a) => !txIds.has(a.transactionId))
          db.reconciliations = db.reconciliations.filter((r) => !txIds.has(r.transactionId))
          db.invoices = db.invoices.filter((i) => i.organizationId !== user.organizationId)
          db.invoiceDrafts = []
          db.importBatches = db.importBatches.filter((b) => !entities.has(b.entityId))
          db.budgets = db.budgets.filter((b) => !entities.has(b.entityId))
          db.subscriptions = db.subscriptions.filter((s) => !entities.has(s.entityId))
          db.aiInsights = db.aiInsights.filter((i) => i.organizationId !== user.organizationId)
          db.aiUsage = db.aiUsage.filter((r) => r.organizationId !== user.organizationId)
        }
        db.deletionRequests.push(request)
        return request
      }),

    listDeletionRequests: () =>
      ctx.runtime.run('privacy.listDeletionRequests', () => {
        const user = currentUser(ctx, 'privacy.listDeletionRequests')
        return ctx.db.deletionRequests.filter((r) => r.requestedByUserId === user.id)
      }),

    resetDemoData: () =>
      ctx.runtime.run('demo.reset', () => {
        ctx.reset()
        if (!ctx.db.users.some((u) => u.id === ctx.session.userId)) ctx.session.userId = null
      }),
  }
}
