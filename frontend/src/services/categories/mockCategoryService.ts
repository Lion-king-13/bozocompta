import { conflict, notFound, validationError } from '@/core/mock/mockRuntime'
import type { Category } from '@/domain'
import type { MockContext } from '../mock/context'
import { currentUser, requirePermission } from '../mock/access'
import type { CategoryInput, CategoryService } from './CategoryService'

function validate(
  ctx: MockContext,
  operation: string,
  input: CategoryInput,
  orgId: string,
  exceptId?: string,
) {
  if (!input.name.trim()) throw validationError(operation, 'name', 'Le nom est requis.')
  if (!/^[A-Z0-9_-]{2,20}$/.test(input.code)) {
    throw validationError(operation, 'code', 'Code : 2 à 20 caractères A-Z, 0-9, _ ou -.')
  }
  if (
    ctx.db.categories.some(
      (c) => c.organizationId === orgId && c.code === input.code && c.id !== exceptId,
    )
  ) {
    throw validationError(operation, 'code', 'Ce code existe déjà.')
  }
}

export function createMockCategoryService(ctx: MockContext): CategoryService {
  return {
    listCategories: () =>
      ctx.runtime.run('categories.list', () => {
        const user = currentUser(ctx, 'categories.list')
        return ctx.db.categories.filter((c) => c.organizationId === user.organizationId)
      }),
    createCategory: (input) =>
      ctx.runtime.run('categories.create', () => {
        const user = currentUser(ctx, 'categories.create')
        requirePermission(user, 'categories:manage', 'categories.create')
        validate(ctx, 'categories.create', input, user.organizationId)
        const category: Category = {
          id: ctx.nextId('cat'),
          organizationId: user.organizationId,
          code: input.code,
          name: input.name.trim(),
        }
        ctx.db.categories.push(category)
        return category
      }),
    updateCategory: (id, input) =>
      ctx.runtime.run('categories.update', () => {
        const user = currentUser(ctx, 'categories.update')
        requirePermission(user, 'categories:manage', 'categories.update')
        const category = ctx.db.categories.find(
          (c) => c.id === id && c.organizationId === user.organizationId,
        )
        if (!category) throw notFound('categories.update', 'Catégorie')
        validate(ctx, 'categories.update', input, user.organizationId, id)
        Object.assign(category, { code: input.code, name: input.name.trim() })
        return category
      }),
    deleteCategory: (id) =>
      ctx.runtime.run('categories.delete', () => {
        const op = 'categories.delete'
        const user = currentUser(ctx, op)
        requirePermission(user, 'categories:manage', op)
        const index = ctx.db.categories.findIndex(
          (c) => c.id === id && c.organizationId === user.organizationId,
        )
        if (index < 0) throw notFound(op, 'Catégorie')
        const used =
          ctx.db.invoices.some((i) => i.categoryId === id) ||
          ctx.db.transactions.some((t) => t.categoryId === id) ||
          ctx.db.budgets.some((b) => b.categoryId === id)
        if (used) {
          throw conflict(op, 'Cette catégorie est utilisée : elle ne peut pas être supprimée.')
        }
        ctx.db.categories.splice(index, 1)
      }),
  }
}
