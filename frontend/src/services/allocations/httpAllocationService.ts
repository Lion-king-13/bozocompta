import type { HttpClient } from '@/core/http/httpClient'
import type { Allocation } from '@/domain'
import type { AllocationService } from './AllocationService'

export function createHttpAllocationService(http: HttpClient): AllocationService {
  return {
    listAllocations: (query = {}) =>
      http.get<Allocation[]>('/allocations', {
        query: { ...query },
        operation: 'allocations.list',
      }),
    replaceAllocations: (transactionId, inputs) =>
      http.put<Allocation[]>(`/transactions/${encodeURIComponent(transactionId)}/allocations`, {
        body: { allocations: inputs },
        operation: 'allocations.replace',
      }),
  }
}
