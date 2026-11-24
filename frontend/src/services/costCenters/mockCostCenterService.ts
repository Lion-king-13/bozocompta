import { notFound, validationError } from '@/core/mock/mockRuntime'
import type { CostCenter } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { CostCenterInput, CostCenterService } from './CostCenterService'

function validate(operation: string, input: CostCenterInput) {
  if (!input.name.trim()) throw validationError(operation, 'name', 'Le nom est requis.')
  if (!input.code.trim()) throw validationError(operation, 'code', 'Le code est requis.')
}

export function createMockCostCenterService(ctx: MockContext): CostCenterService {
  return {
    listCostCenters: (query = {}) =>
      ctx.runtime.run('costCenters.list', () => {
        const user = currentUser(ctx, 'costCenters.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'costCenters.list')
        const entities = accessibleEntityIds(ctx, user)
        return ctx.db.costCenters
          .filter((c) => entities.has(c.entityId))
          .filter((c) => !query.entityId || c.entityId === query.entityId)
          .filter((c) => !query.type || c.type === query.type)
      }),
    createCostCenter: (input) =>
      ctx.runtime.run('costCenters.create', () => {
        const user = currentUser(ctx, 'costCenters.create')
        requirePermission(user, 'cost-centers:manage', 'costCenters.create')
        assertEntityAccess(ctx, user, input.entityId, 'costCenters.create')
        validate('costCenters.create', input)
        const cc: CostCenter = { id: ctx.nextId('cc'), ...input }
        ctx.db.costCenters.push(cc)
        return cc
      }),
    updateCostCenter: (id, input) =>
      ctx.runtime.run('costCenters.update', () => {
        const user = currentUser(ctx, 'costCenters.update')
        requirePermission(user, 'cost-centers:manage', 'costCenters.update')
        const cc = ctx.db.costCenters.find((c) => c.id === id)
        if (!cc || !accessibleEntityIds(ctx, user).has(cc.entityId))
          throw notFound('costCenters.update', 'Centre de coûts')
        assertEntityAccess(ctx, user, input.entityId, 'costCenters.update')
        validate('costCenters.update', input)
        Object.assign(cc, input)
        return cc
      }),
  }
}
