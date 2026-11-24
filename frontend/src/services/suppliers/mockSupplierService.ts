import type { MockContext } from '../mock/context'
import { currentUser } from '../mock/access'
import type { SupplierService } from './SupplierService'

export function createMockSupplierService(ctx: MockContext): SupplierService {
  return {
    listSuppliers: () =>
      ctx.runtime.run('suppliers.list', () => {
        const user = currentUser(ctx, 'suppliers.list')
        return ctx.db.suppliers.filter((s) => s.organizationId === user.organizationId)
      }),
  }
}
