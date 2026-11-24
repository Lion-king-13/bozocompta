import type { BudgetStatus, Id } from '@/domain'

export interface BudgetQuery {
  entityId?: Id
  /** `YYYY-MM` ; défaut = mois courant de la démo. */
  month?: string
}

export interface BudgetService {
  /** Budgets avec consommation (base imputée, calcul unique). */
  listBudgetStatuses(query?: BudgetQuery): Promise<BudgetStatus[]>
}
