import type { BasisPoints, Cents, Id } from './common'

/**
 * Budget MENSUEL d'une entité, éventuellement restreint à une catégorie et/ou un centre de
 * coûts (arbitrage D10). Consommé sur la base de l'IMPUTÉ (allocations effectives).
 */
export interface Budget {
  id: Id
  entityId: Id
  categoryId: Id | null
  costCenterId: Id | null
  label: string
  /** Mois `YYYY-MM`. */
  month: string
  amountCents: Cents
}

export interface BudgetStatus {
  budget: Budget
  consumedCents: Cents
  /** Négatif en cas de dépassement. */
  remainingCents: Cents
  consumedBp: BasisPoints
  overBudget: boolean
}
