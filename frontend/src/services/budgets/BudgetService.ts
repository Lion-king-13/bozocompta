import type { Budget, BudgetDetail, BudgetInput, BudgetStatus, Id } from '@/domain'

export interface BudgetQuery {
  entityId?: Id
  /** `YYYY-MM` ; défaut = mois courant de la démo. */
  month?: string
}

export interface BudgetService {
  /** Budgets avec consommation (base imputée, calcul unique). */
  listBudgetStatuses(query?: BudgetQuery): Promise<BudgetStatus[]>
  /** Statut + lignes imputées qui consomment le budget. */
  getBudgetDetail(id: Id): Promise<BudgetDetail>
  /** Permission `budgets:manage`. Montant > 0, mois `YYYY-MM`, sinon `VALIDATION_ERROR`. */
  createBudget(input: BudgetInput): Promise<Budget>
  updateBudget(id: Id, input: BudgetInput): Promise<Budget>
  deleteBudget(id: Id): Promise<void>
}
