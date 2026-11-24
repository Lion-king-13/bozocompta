import type { HttpClient } from '@/core/http/httpClient'
import type { BudgetStatus } from '@/domain'
import type { BudgetService } from './BudgetService'

export function createHttpBudgetService(http: HttpClient): BudgetService {
  return {
    listBudgetStatuses: (query = {}) =>
      http.get<BudgetStatus[]>('/budgets', { query: { ...query }, operation: 'budgets.list' }),
  }
}
