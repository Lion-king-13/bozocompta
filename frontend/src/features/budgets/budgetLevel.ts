import type { BudgetStatus } from '@/domain'
import type { BusinessStatus } from '@/components/ui'
import { formatCents } from '@/core/money'

/** Seuils d'alerte des budgets, en points de base (80 % et 100 %). */
export const BUDGET_WARNING_BP = 8_000
export const BUDGET_LIMIT_BP = 10_000

export type BudgetLevel = 'ok' | 'near' | 'reached' | 'exceeded'

/**
 * Niveau d'un budget à partir de son statut (calculé par `computeBudgetStatus`) :
 * < 80 % → ok ; 80 % à < 100 % → seuil d'alerte ; = 100 % → limite atteinte ;
 * > 100 % → dépassé.
 */
export function budgetLevel(status: BudgetStatus): BudgetLevel {
  if (status.overBudget) return 'exceeded'
  if (status.consumedBp >= BUDGET_LIMIT_BP) return 'reached'
  if (status.consumedBp >= BUDGET_WARNING_BP) return 'near'
  return 'ok'
}

export const BUDGET_LEVEL_BADGE: Record<BudgetLevel, { status: BusinessStatus; label?: string }> = {
  ok: { status: 'budget_ok' },
  near: { status: 'budget_near' },
  reached: { status: 'budget_exceeded', label: 'Budget entièrement consommé' },
  exceeded: { status: 'budget_exceeded' },
}

/** « Il reste 1 200,00 € » ou « Dépassé de 600,00 € ». */
export function remainingText(status: BudgetStatus): string {
  return status.remainingCents >= 0
    ? `Il reste ${formatCents(status.remainingCents)}`
    : `Dépassé de ${formatCents(-status.remainingCents)}`
}

export function consumedText(status: BudgetStatus): string {
  return `${formatCents(status.consumedCents)} sur ${formatCents(status.budget.amountCents)}`
}
