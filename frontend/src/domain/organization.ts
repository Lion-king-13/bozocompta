import type { CurrencyCode, Id, IsoDateTime } from './common'
import type { PlanId } from './plan'

/** Pays supportés. HYPOTHÈSE : seulement Belgique et France pour l'instant. */
export type CountryCode = 'BE' | 'FR'

/** Client de CashLens (le « tenant » B2B). Une organisation regroupe des entités juridiques. */
export interface Organization {
  id: Id
  name: string
  planId: PlanId
  createdAt: IsoDateTime
}

/** Entité juridique (société) appartenant à une organisation. */
export interface LegalEntity {
  id: Id
  organizationId: Id
  name: string
  country: CountryCode
  /** Numéro de TVA intracommunautaire (fictif dans le jeu mock). */
  vatNumber: string
  /** Numéro d'entreprise : BCE (BE) ou SIREN (FR). Fictif. */
  registrationNumber: string
  currency: CurrencyCode
}
