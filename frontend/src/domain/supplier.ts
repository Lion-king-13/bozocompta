import type { Id } from './common'
import type { CountryCode } from './organization'

/** Fournisseur (émetteur des factures reçues). */
export interface Supplier {
  id: Id
  organizationId: Id
  name: string
  country: CountryCode | 'OTHER'
  vatNumber: string | null
  /** Catégorie libre pour regrouper les dépenses (ex. « Logiciels »). */
  category: string
}
