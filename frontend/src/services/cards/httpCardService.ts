import type { HttpClient } from '@/core/http/httpClient'
import type { Card } from '@/domain'
import type { CardService } from './CardService'

export function createHttpCardService(http: HttpClient): CardService {
  return {
    listCards: (query = {}) =>
      http.get<Card[]>('/cards', { query: { ...query }, operation: 'cards.list' }),
    getCard: (id) => http.get<Card>(`/cards/${encodeURIComponent(id)}`, { operation: 'cards.get' }),
  }
}
