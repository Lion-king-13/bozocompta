import type { Supplier } from '@/domain'

export interface SupplierService {
  listSuppliers(): Promise<Supplier[]>
}
