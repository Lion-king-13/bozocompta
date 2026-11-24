import { notFound, validationError } from '@/core/mock/mockRuntime'
import { buildAllocations, validateAllocationInputs } from '@/domain/finance'
import type { MockContext } from '../mock/context'
import {
  assertEntityAccess,
  currentUser,
  isTransactionVisible,
  requirePermission,
} from '../mock/access'
import type { AllocationService } from './AllocationService'

export function createMockAllocationService(ctx: MockContext): AllocationService {
  return {
    listAllocations: (query = {}) =>
      ctx.runtime.run('allocations.list', () => {
        const user = currentUser(ctx, 'allocations.list')
        requirePermission(user, 'allocations:read', 'allocations.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'allocations.list')
        const visibleTx = new Set(
          ctx.db.transactions.filter((t) => isTransactionVisible(ctx, user, t)).map((t) => t.id),
        )
        return ctx.db.allocations
          .filter((a) => visibleTx.has(a.transactionId))
          .filter((a) => !query.transactionId || a.transactionId === query.transactionId)
          .filter((a) => !query.entityId || a.entityId === query.entityId)
      }),

    replaceAllocations: (transactionId, inputs) =>
      ctx.runtime.run('allocations.replace', () => {
        const op = 'allocations.replace'
        const user = currentUser(ctx, op)
        requirePermission(user, 'allocations:write', op)
        const tx = ctx.db.transactions.find((t) => t.id === transactionId)
        if (!tx || !isTransactionVisible(ctx, user, tx)) throw notFound(op, 'Transaction')
        if (tx.direction !== 'debit')
          throw validationError(op, 'transactionId', 'Seuls les débits peuvent être ventilés.')
        if (inputs.length > 0) {
          const error = validateAllocationInputs(inputs)
          if (error) throw validationError(op, 'allocations', error)
          for (const [i, input] of inputs.entries()) {
            assertEntityAccess(ctx, user, input.entityId, op)
            const cc = input.costCenterId
              ? ctx.db.costCenters.find((c) => c.id === input.costCenterId)
              : null
            if (input.costCenterId && (!cc || cc.entityId !== input.entityId)) {
              throw validationError(
                op,
                `allocations.${i}.costCenterId`,
                "Le centre de coûts doit appartenir à l'entité choisie.",
              )
            }
          }
        }
        const created =
          inputs.length > 0 ? buildAllocations(tx, inputs, () => ctx.nextId('alloc')) : []
        ctx.db.allocations = ctx.db.allocations
          .filter((a) => a.transactionId !== transactionId)
          .concat(created)
        return created
      }),
  }
}
