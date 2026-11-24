import { DEMO_TODAY } from '@/config/demo'
import { addDays } from '@/core/dates/dates'
import { computeDueItems } from '@/domain/finance'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { SubscriptionService } from './SubscriptionService'

export function createMockSubscriptionService(ctx: MockContext): SubscriptionService {
  return {
    listSubscriptions: (query = {}) =>
      ctx.runtime.run('subscriptions.list', () => {
        const user = currentUser(ctx, 'subscriptions.list')
        requirePermission(user, 'subscriptions:read', 'subscriptions.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'subscriptions.list')
        const entities = accessibleEntityIds(ctx, user)
        return ctx.db.subscriptions.filter(
          (s) => entities.has(s.entityId) && (!query.entityId || s.entityId === query.entityId),
        )
      }),
    listDueItems: (query = {}) =>
      ctx.runtime.run('subscriptions.listDueItems', () => {
        const user = currentUser(ctx, 'subscriptions.listDueItems')
        requirePermission(user, 'subscriptions:read', 'subscriptions.listDueItems')
        if (query.entityId)
          assertEntityAccess(ctx, user, query.entityId, 'subscriptions.listDueItems')
        const entities = accessibleEntityIds(ctx, user)
        const range = query.range ?? { start: DEMO_TODAY, end: addDays(DEMO_TODAY, 30) }
        return computeDueItems(ctx.db.subscriptions, ctx.db.invoices, range, DEMO_TODAY).filter(
          (d) => entities.has(d.entityId) && (!query.entityId || d.entityId === query.entityId),
        )
      }),
  }
}
