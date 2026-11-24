import { ratioBp, sumCents } from '@/core/money'
import type { Budget, BudgetStatus } from '../budget'
import type { ImputedLine } from '../spend'

/**
 * Consommation d'un budget mensuel = somme des lignes IMPUTÉES (issues de
 * `computeImputedLines`, le calcul unique) du mois, à l'entité du budget, et le cas échéant
 * à sa catégorie et à son centre de coûts.
 */
export function computeBudgetStatus(budget: Budget, lines: readonly ImputedLine[]): BudgetStatus {
  const consumedCents = sumCents(
    lines
      .filter(
        (l) =>
          l.bookingDate.slice(0, 7) === budget.month &&
          l.entityId === budget.entityId &&
          (!budget.categoryId || l.categoryId === budget.categoryId) &&
          (!budget.costCenterId || l.costCenterId === budget.costCenterId),
      )
      .map((l) => l.amountCents),
  )
  return {
    budget,
    consumedCents,
    remainingCents: budget.amountCents - consumedCents,
    consumedBp: ratioBp(consumedCents, budget.amountCents),
    overBudget: consumedCents > budget.amountCents,
  }
}

/** Période couvrant un mois `YYYY-MM` (pour appeler `computeImputedLines`). */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` }
}
