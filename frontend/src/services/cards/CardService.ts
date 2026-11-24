import type { Card, Id } from '@/domain'

export interface CardQuery {
  entityId?: Id
  holderUserId?: Id
}

export interface CardService {
  listCards(query?: CardQuery): Promise<Card[]>
  getCard(id: Id): Promise<Card>
}
