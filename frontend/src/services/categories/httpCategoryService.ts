import type { HttpClient } from '@/core/http/httpClient'
import type { Category } from '@/domain'
import type { CategoryService } from './CategoryService'

export function createHttpCategoryService(http: HttpClient): CategoryService {
  return {
    listCategories: () => http.get<Category[]>('/categories', { operation: 'categories.list' }),
    createCategory: (input) =>
      http.post<Category>('/categories', { body: input, operation: 'categories.create' }),
    updateCategory: (id, input) =>
      http.put<Category>(`/categories/${encodeURIComponent(id)}`, {
        body: input,
        operation: 'categories.update',
      }),
    deleteCategory: (id) =>
      http.delete<void>(`/categories/${encodeURIComponent(id)}`, {
        operation: 'categories.delete',
      }),
  }
}
