import type { Category, Id } from '@/domain'

export type CategoryInput = Pick<Category, 'code' | 'name'>

export interface CategoryService {
  listCategories(): Promise<Category[]>
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(id: Id, input: CategoryInput): Promise<Category>
  /** Suppression d'une catégorie INUTILISÉE (sinon `CONFLICT`). */
  deleteCategory(id: Id): Promise<void>
}
