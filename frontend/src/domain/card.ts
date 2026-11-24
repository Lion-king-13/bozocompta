import type { Cents, Id } from './common'

export type CardStatus = 'active' | 'blocked' | 'expired'

/**
 * Carte de paiement d'entreprise. Chaque carte appartient à UNE entité et à UN collaborateur ;
 * un collaborateur peut en avoir plusieurs (y compris sur des entités différentes).
 * Données entièrement fictives.
 */
export interface Card {
  id: Id
  entityId: Id
  holderUserId: Id
  label: string
  /** 4 derniers chiffres uniquement. */
  last4: string
  network: 'visa' | 'mastercard'
  status: CardStatus
  monthlyLimitCents: Cents
  /** Format `YYYY-MM`. */
  expiresAt: string
}
