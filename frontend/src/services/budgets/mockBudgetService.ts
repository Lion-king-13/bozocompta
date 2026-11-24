import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { notFound, validationError } from '@/core/mock/mockRuntime'
import {
  budgetLines,
  computeBudgetStatus,
  computeImputedLines,
  monthRange,
} from '@/domain/finance'
import type { Budget, BudgetInput, User } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { BudgetService } from './BudgetService'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export function createMockBudgetService(ctx: MockContext): BudgetService {
  /** Budget d'une entité accessible à l'utilisateur, sinon 404. */
  function findBudget(user: User, id: string, operation: string): Budget {
    const budget = ctx.db.budgets.find((b) => b.id === id)
    if (!budget || !accessibleEntityIds(ctx, user).has(budget.entityId))
      throw notFound(operation, 'Budget')
    return budget
  }

  function checkInput(user: User, input: BudgetInput, operation: string): BudgetInput {
    requirePermission(user, 'budgets:manage', operation)
    assertEntityAccess(ctx, user, input.entityId, operation)
    const label = input.label.trim()
    if (!label) throw validationError(operation, 'label', 'Le libellé est requis.')
    if (!MONTH.test(input.month))
      throw validationError(operation, 'month', 'Mois attendu au format AAAA-MM.')
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
      throw validationError(operation, 'amountCents', 'Le montant doit être supérieur à zéro.')
    if (input.costCenterId) {
      const cc = ctx.db.costCenters.find((c) => c.id === input.costCenterId)
      if (!cc || cc.entityId !== input.entityId)
        throw validationError(
          operation,
          'costCenterId',
          "Le centre de coûts doit appartenir à l'entité du budget.",
        )
    }
    return { ...input, label }
  }

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

    getBudgetDetail: (id) =>
      ctx.runtime.run('budgets.get', () => {
        const user = currentUser(ctx, 'budgets.get')
        requirePermission(user, 'budgets:read', 'budgets.get')
        const budget = findBudget(user, id, 'budgets.get')
        const lines = computeImputedLines(ctx.db, monthRange(budget.month))
        const txById = new Map(ctx.db.transactions.map((t) => [t.id, t]))
        return {
          status: computeBudgetStatus(budget, lines),
          lines: budgetLines(budget, lines).map((l) => ({
            ...l,
            label: txById.get(l.transactionId)?.label ?? '',
            counterpartyName: txById.get(l.transactionId)?.counterpartyName ?? '',
          })),
        }
      }),

    createBudget: (input) =>
      ctx.runtime.run('budgets.create', () => {
        const user = currentUser(ctx, 'budgets.create')
        const budget: Budget = {
          id: ctx.nextId('bud'),
          ...checkInput(user, input, 'budgets.create'),
        }
        ctx.db.budgets.push(budget)
        return budget
      }),

    updateBudget: (id, input) =>
      ctx.runtime.run('budgets.update', () => {
        const user = currentUser(ctx, 'budgets.update')
        const checked = checkInput(user, input, 'budgets.update')
        const budget = findBudget(user, id, 'budgets.update')
        Object.assign(budget, checked)
        return budget
      }),

    deleteBudget: (id) =>
      ctx.runtime.run('budgets.delete', () => {
        const user = currentUser(ctx, 'budgets.delete')
        requirePermission(user, 'budgets:manage', 'budgets.delete')
        const budget = findBudget(user, id, 'budgets.delete')
        ctx.db.budgets.splice(ctx.db.budgets.indexOf(budget), 1)
      }),
  }
}
