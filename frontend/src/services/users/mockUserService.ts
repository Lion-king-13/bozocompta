import { notFound } from '@/core/mock/mockRuntime'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { UserService } from './UserService'

export function createMockUserService(ctx: MockContext): UserService {
  return {
    listUsers: (query = {}) =>
      ctx.runtime.run('users.list', () => {
        const user = currentUser(ctx, 'users.list')
        requirePermission(user, 'users:read', 'users.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'users.list')
        const entities = accessibleEntityIds(ctx, user)
        return ctx.db.users.filter(
          (u) =>
            u.organizationId === user.organizationId &&
            u.entityIds.some((e) => entities.has(e)) &&
            (!query.entityId || u.entityIds.includes(query.entityId)),
        )
      }),
    getUser: (id) =>
      ctx.runtime.run('users.get', () => {
        const user = currentUser(ctx, 'users.get')
        const found = ctx.db.users.find(
          (u) => u.id === id && u.organizationId === user.organizationId,
        )
        if (!found) throw notFound('users.get', 'Collaborateur')
        return found
      }),
  }
}
