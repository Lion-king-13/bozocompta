import type { BasisPoints, Cents, Id } from './common'
import type { ImputedLine } from './spend'

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

/** Saisie d'un budget (création / modification). */
export type BudgetInput = Omit<Budget, 'id'>

/** Ligne imputée qui consomme un budget, avec le libellé de sa transaction. */
export interface BudgetConsumptionLine extends ImputedLine {
  label: string
  counterpartyName: string
}

/** Détail d'un budget : statut + lignes imputées qui le consomment (calcul unique). */
export interface BudgetDetail {
  status: BudgetStatus
  lines: BudgetConsumptionLine[]
}
