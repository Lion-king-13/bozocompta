import type { Cents, Id, IsoDate } from './common'

export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'yearly'

/**
 * Abonnement = abonnement FOURNISSEUR récurrent (SaaS, télécom…) — arbitrage D8.
 * À ne pas confondre avec l'offre / le plan CashLens (`Plan`).
 */
export interface RecurringSubscription {
  id: Id
  entityId: Id
  supplierId: Id
  categoryId: Id | null
  costCenterId: Id | null
  cardId: Id | null
  name: string
  /** Montant TTC par renouvellement. */
  amountCents: Cents
  frequency: RecurrenceFrequency
  startDate: IsoDate
  nextRenewalDate: IsoDate
  status: 'active' | 'cancelled'
}

/**
 * Échéance = date à venir (D8) : renouvellement d'abonnement OU date limite de paiement
 * d'une facture non payée. Calculée, jamais stockée.
 */
export interface DueItem {
  kind: 'subscription_renewal' | 'invoice_due'
  /** Id de l'abonnement ou de la facture. */
  sourceId: Id
  entityId: Id
  label: string
  dueDate: IsoDate
  amountCents: Cents
  /** Date dépassée par rapport à l'horloge de démo (factures uniquement). */
  overdue: boolean
}
