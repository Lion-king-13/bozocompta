import type { HttpClient } from '@/core/http/httpClient'
import type { DueItem, RecurringSubscription } from '@/domain'
import type { SubscriptionService } from './SubscriptionService'

export function createHttpSubscriptionService(http: HttpClient): SubscriptionService {
  return {
    listSubscriptions: (query = {}) =>
      http.get<RecurringSubscription[]>('/subscriptions', {
        query: { ...query },
        operation: 'subscriptions.list',
      }),
    listDueItems: (query = {}) =>
      http.get<DueItem[]>('/due-items', {
        query: { entityId: query.entityId, from: query.range?.start, to: query.range?.end },
        operation: 'subscriptions.listDueItems',
      }),
  }
}
