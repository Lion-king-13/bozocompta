import { notFound, validationError } from '@/core/mock/mockRuntime'
import type { Card } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import type { CardInput, CardService } from './CardService'

function validate(ctx: MockContext, operation: string, input: CardInput): void {
  if (!input.label.trim()) throw validationError(operation, 'label', 'Le libellé est requis.')
  if (!/^\d{4}$/.test(input.last4))
    throw validationError(operation, 'last4', 'Indiquez exactement les 4 derniers chiffres.')
  if (!Number.isSafeInteger(input.monthlyLimitCents) || input.monthlyLimitCents < 0)
    throw validationError(operation, 'monthlyLimitCents', 'Plafond invalide.')
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.expiresAt))
    throw validationError(operation, 'expiresAt', "Date d'expiration au format AAAA-MM.")
  const holder = ctx.db.users.find((u) => u.id === input.holderUserId)
  if (!holder || !holder.entityIds.includes(input.entityId)) {
    throw validationError(
      operation,
      'holderUserId',
      "Le titulaire doit être membre de l'entité de la carte.",
    )
  }
}

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
    createCard: (input) =>
      ctx.runtime.run('cards.create', () => {
        const user = currentUser(ctx, 'cards.create')
        requirePermission(user, 'cards:manage', 'cards.create')
        assertEntityAccess(ctx, user, input.entityId, 'cards.create')
        validate(ctx, 'cards.create', input)
        const card: Card = { id: ctx.nextId('card'), ...input, label: input.label.trim() }
        ctx.db.cards.push(card)
        return card
      }),
    updateCard: (id, input) =>
      ctx.runtime.run('cards.update', () => {
        const user = currentUser(ctx, 'cards.update')
        requirePermission(user, 'cards:manage', 'cards.update')
        const card = ctx.db.cards.find((c) => c.id === id)
        if (!card || !accessibleEntityIds(ctx, user).has(card.entityId))
          throw notFound('cards.update', 'Carte')
        assertEntityAccess(ctx, user, input.entityId, 'cards.update')
        validate(ctx, 'cards.update', input)
        Object.assign(card, input, { label: input.label.trim() })
        return card
      }),
  }
}
