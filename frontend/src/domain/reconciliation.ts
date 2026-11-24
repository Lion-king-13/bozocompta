import type { BasisPoints, Cents, Id, IsoDateTime } from './common'

/**
 * Rapprochement facture ↔ transaction (arbitrage D6) : simple LIEN, sans effet sur les
 * totaux de dépenses. Au plus 1 facture ↔ 1 transaction confirmée de chaque côté.
 * Suggestion (montant identique + date proche + fournisseur, score indicatif), définitive
 * seulement après décision humaine : suggested → confirmed | rejected (par qui, quand).
 * Un rapprochement manuel est créé directement `confirmed`.
 */
export type ReconciliationStatus = 'suggested' | 'confirmed' | 'rejected'

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  suggested: 'Suggéré (IA)',
  confirmed: 'Confirmé',
  rejected: 'Rejeté',
}

export interface Reconciliation {
  id: Id
  invoiceId: Id
  transactionId: Id
  status: ReconciliationStatus
  origin: 'ai_suggestion' | 'manual'
  /** Confiance de la suggestion IA, en points de base (9 500 = 95 %) ; null si manuel. */
  confidenceBp: BasisPoints | null
  /** Raisons lisibles de la suggestion (montant identique, référence trouvée…). */
  matchReasons: string[]
  /** Montant transaction − TTC facture. 0 = correspondance exacte. */
  amountDifferenceCents: Cents
  suggestedAt: IsoDateTime
  decidedAt: IsoDateTime | null
  decidedByUserId: Id | null
  /** Motif facultatif saisi lors d'un rejet (QA-19). */
  rejectionReason: string | null
}

export interface ReconciliationQuery {
  status?: ReconciliationStatus
  /** Transaction payée par cette entité OU imputée (en partie) à elle (QA-05). */
  entityId?: Id
}
