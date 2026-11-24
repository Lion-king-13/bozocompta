import type { HttpClient } from '@/core/http/httpClient'
import type { CostCenter } from '@/domain'
import type { CostCenterService } from './CostCenterService'

export function createHttpCostCenterService(http: HttpClient): CostCenterService {
  return {
    listCostCenters: (query = {}) =>
      http.get<CostCenter[]>('/cost-centers', {
        query: { ...query },
        operation: 'costCenters.list',
      }),
    createCostCenter: (input) =>
      http.post<CostCenter>('/cost-centers', { body: input, operation: 'costCenters.create' }),
    updateCostCenter: (id, input) =>
      http.put<CostCenter>(`/cost-centers/${encodeURIComponent(id)}`, {
        body: input,
        operation: 'costCenters.update',
      }),
  }
}
