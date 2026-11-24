import type { HttpClient } from '@/core/http/httpClient'
import type { AiInsight } from '@/domain'
import type { AiInsightService } from './AiInsightService'

export function createHttpAiInsightService(http: HttpClient): AiInsightService {
  const path = (id: string) => `/ai/insights/${encodeURIComponent(id)}`
  return {
    listInsights: (query = {}) =>
      http.get<AiInsight[]>('/ai/insights', { query: { ...query }, operation: 'insights.list' }),
    runAnalysis: () => http.post<AiInsight[]>('/ai/insights/analyze', { operation: 'ai.analyze' }),
    dismissInsight: (id) =>
      http.post<AiInsight>(`${path(id)}/dismiss`, { operation: 'insights.dismiss' }),
    resolveInsight: (id) =>
      http.post<AiInsight>(`${path(id)}/resolve`, { operation: 'insights.resolve' }),
  }
}
