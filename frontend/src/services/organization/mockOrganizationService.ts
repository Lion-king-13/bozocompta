import { notFound } from '@/core/mock/mockRuntime'
import type { MockContext } from '../mock/context'
import { accessibleEntityIds, currentUser } from '../mock/access'
import type { OrganizationService } from './OrganizationService'

export function createMockOrganizationService(ctx: MockContext): OrganizationService {
  return {
    getCurrentOrganization: () =>
      ctx.runtime.run('organization.get', () => {
        const user = currentUser(ctx, 'organization.get')
        const org = ctx.db.organizations.find((o) => o.id === user.organizationId)
        if (!org) throw notFound('organization.get', 'Organisation')
        return org
      }),
    listEntities: () =>
      ctx.runtime.run('organization.listEntities', () => {
        const ids = accessibleEntityIds(ctx, currentUser(ctx, 'organization.listEntities'))
        return ctx.db.entities.filter((e) => ids.has(e.id))
      }),
  }
}
