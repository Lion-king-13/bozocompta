import type { HttpClient } from '@/core/http/httpClient'
import type { AiUsageRecord, AiUsageSummary, Page } from '@/domain'
import type { AiUsageService } from './AiUsageService'

export function createHttpAiUsageService(http: HttpClient): AiUsageService {
  return {
    getUsageSummary: (query = {}) =>
      http.get<AiUsageSummary>('/ai/usage/summary', {
        query: { ...query },
        operation: 'aiUsage.summary',
      }),
    listUsage: (query = {}) =>
      http.get<Page<AiUsageRecord>>('/ai/usage', {
        query: { ...query },
        operation: 'aiUsage.list',
      }),
  }
}
