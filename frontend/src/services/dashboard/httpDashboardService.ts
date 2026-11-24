import type { HttpClient } from '@/core/http/httpClient'
import type { DashboardSummary } from '@/domain'
import type { DashboardService } from './DashboardService'

export function createHttpDashboardService(http: HttpClient): DashboardService {
  return {
    getSummary: (query = {}) =>
      http.get<DashboardSummary>('/dashboard/summary', {
        query: {
          entityId: query.entityId ?? undefined,
          from: query.period?.start,
          to: query.period?.end,
        },
        operation: 'dashboard.summary',
      }),
  }
}
