import type { HttpClient } from '@/core/http/httpClient'
import type { Reconciliation } from '@/domain'
import type { ReconciliationService } from './ReconciliationService'

export function createHttpReconciliationService(http: HttpClient): ReconciliationService {
  const path = (id: string) => `/reconciliations/${encodeURIComponent(id)}`
  return {
    listReconciliations: (query = {}) =>
      http.get<Reconciliation[]>('/reconciliations', {
        query: { ...query },
        operation: 'reconciliations.list',
      }),
    suggestReconciliations: () =>
      http.post<Reconciliation[]>('/reconciliations/suggest', {
        operation: 'ai.suggestReconciliations',
      }),
    confirmReconciliation: (id) =>
      http.post<Reconciliation>(`${path(id)}/confirm`, { operation: 'reconciliations.confirm' }),
    rejectReconciliation: (id, reason) =>
      http.post<Reconciliation>(`${path(id)}/reject`, {
        body: { reason: reason ?? null },
        operation: 'reconciliations.reject',
      }),
    createManualReconciliation: (invoiceId, transactionId) =>
      http.post<Reconciliation>('/reconciliations', {
        body: { invoiceId, transactionId },
        operation: 'reconciliations.createManual',
      }),
  }
}
