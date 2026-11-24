import type { HttpClient } from '@/core/http/httpClient'
import type { Budget, BudgetDetail, BudgetStatus } from '@/domain'
import type { BudgetService } from './BudgetService'

export function createHttpBudgetService(http: HttpClient): BudgetService {
  return {
    listBudgetStatuses: (query = {}) =>
      http.get<BudgetStatus[]>('/budgets', { query: { ...query }, operation: 'budgets.list' }),
    getBudgetDetail: (id) =>
      http.get<BudgetDetail>(`/budgets/${id}`, { operation: 'budgets.get' }),
    createBudget: (input) =>
      http.post<Budget>('/budgets', { body: input, operation: 'budgets.create' }),
    updateBudget: (id, input) =>
      http.put<Budget>(`/budgets/${id}`, { body: input, operation: 'budgets.update' }),
    deleteBudget: (id) => http.delete<void>(`/budgets/${id}`, { operation: 'budgets.delete' }),
  }
}
