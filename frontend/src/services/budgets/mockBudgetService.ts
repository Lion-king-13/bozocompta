import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { computeBudgetStatus, computeImputedLines, monthRange } from '@/domain/finance'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { BudgetService } from './BudgetService'

export function createMockBudgetService(ctx: MockContext): BudgetService {
  return {
    listBudgetStatuses: (query = {}) =>
      ctx.runtime.run('budgets.list', () => {
        const user = currentUser(ctx, 'budgets.list')
        requirePermission(user, 'budgets:read', 'budgets.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'budgets.list')
        const month = query.month ?? DEMO_CURRENT_MONTH
        const entities = accessibleEntityIds(ctx, user)
        // Lignes calculées sur TOUTES les transactions (une part imputée à l'entité peut venir
        // d'une transaction payée par une autre entité).
        const lines = computeImputedLines(ctx.db, monthRange(month))
        return ctx.db.budgets
          .filter((b) => b.month === month && entities.has(b.entityId))
          .filter((b) => !query.entityId || b.entityId === query.entityId)
          .map((b) => computeBudgetStatus(b, lines))
      }),
  }
}
