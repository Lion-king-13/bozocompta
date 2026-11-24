import { computed } from 'vue'
import type { SelectOption } from '@/components/ui'
import type { ReferenceData } from '@/features/transactions/shared/useReferenceData'

/** Options des listes déroulantes du formulaire de facture, à partir des référentiels. */
export function useInvoiceOptions(refData: ReferenceData) {
  const supplierOptions = computed<SelectOption[]>(() =>
    refData.suppliers.value.map((s) => ({ value: s.id, label: s.name })),
  )
  const entityOptions = computed<SelectOption[]>(() =>
    refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
  )
  const categoryOptions = computed<SelectOption[]>(() =>
    refData.categories.value.map((c) => ({ value: c.id, label: c.name })),
  )
  return { supplierOptions, entityOptions, categoryOptions }
}
