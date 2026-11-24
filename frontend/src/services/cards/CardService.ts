import type { Card, Id } from '@/domain'

export interface CardQuery {
  entityId?: Id
  holderUserId?: Id
}

/**
 * Saisie d'une carte : UNE entité, UN titulaire, 4 derniers chiffres seulement
 * (jamais de numéro complet ni de cryptogramme).
 */
export type CardInput = Pick<
  Card,
  | 'entityId'
  | 'holderUserId'
  | 'label'
  | 'last4'
  | 'network'
  | 'status'
  | 'monthlyLimitCents'
  | 'expiresAt'
>

export interface CardService {
  listCards(query?: CardQuery): Promise<Card[]>
  getCard(id: Id): Promise<Card>
  createCard(input: CardInput): Promise<Card>
  /** Modification (y compris désactivation : `status = 'blocked'`). */
  updateCard(id: Id, input: CardInput): Promise<Card>
}
