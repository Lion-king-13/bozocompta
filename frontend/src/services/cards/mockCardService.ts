import { notFound } from '@/core/mock/mockRuntime'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { CardService } from './CardService'

export function createMockCardService(ctx: MockContext): CardService {
  return {
    listCards: (query = {}) =>
      ctx.runtime.run('cards.list', () => {
        const user = currentUser(ctx, 'cards.list')
        requirePermission(user, 'cards:read', 'cards.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'cards.list')
        const entities = accessibleEntityIds(ctx, user)
        return (
          ctx.db.cards
            .filter((c) => entities.has(c.entityId))
            // Un collaborateur (member) ne voit que ses propres cartes.
            .filter((c) => user.role !== 'member' || c.holderUserId === user.id)
            .filter((c) => !query.entityId || c.entityId === query.entityId)
            .filter((c) => !query.holderUserId || c.holderUserId === query.holderUserId)
        )
      }),
    getCard: (id) =>
      ctx.runtime.run('cards.get', () => {
        const user = currentUser(ctx, 'cards.get')
        const card = ctx.db.cards.find((c) => c.id === id)
        const visible =
          card &&
          accessibleEntityIds(ctx, user).has(card.entityId) &&
          (user.role !== 'member' || card.holderUserId === user.id)
        if (!card || !visible) throw notFound('cards.get', 'Carte')
        return card
      }),
  }
}
