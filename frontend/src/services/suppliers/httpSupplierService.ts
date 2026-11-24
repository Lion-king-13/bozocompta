import type { HttpClient } from '@/core/http/httpClient'
import type { Supplier } from '@/domain'
import type { SupplierService } from './SupplierService'

export function createHttpSupplierService(http: HttpClient): SupplierService {
  return {
    listSuppliers: () => http.get<Supplier[]>('/suppliers', { operation: 'suppliers.list' }),
  }
}
