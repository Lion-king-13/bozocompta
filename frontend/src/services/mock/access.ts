import { ApiError, DEFAULT_ERROR_MESSAGES } from '@/core/errors'
import {
  DEFAULT_PAGE_SIZE,
  canAccessEntity,
  hasPermission,
  type BankTransaction,
  type Id,
  type Invoice,
  type Page,
  type PageQuery,
  type Permission,
  type User,
} from '@/domain'
import type { MockContext } from './context'

/**
 * Contrôles d'accès des services MOCK.
 *
 * ⚠ SIMULATION D'AFFICHAGE, PAS UNE SÉCURITÉ : tout tourne dans le navigateur et peut être
 * contourné. Ils servent à montrer à l'écran le comportement attendu (données filtrées par
 * organisation et entités accessibles, 401, 403). L'isolation réelle des données relève du
 * backend (partie A), qui doit refaire TOUS ces contrôles côté serveur.
 */

export function currentUser(ctx: MockContext, operation: string): User {
  const user = ctx.db.users.find((u) => u.id === ctx.session.userId && u.active)
  if (!user) {
    throw new ApiError({
      code: 'UNAUTHENTICATED',
      status: 401,
      message: DEFAULT_ERROR_MESSAGES.UNAUTHENTICATED,
      operation,
    })
  }
  return user
}

export function forbidden(operation: string, message = DEFAULT_ERROR_MESSAGES.FORBIDDEN): ApiError {
  return new ApiError({ code: 'FORBIDDEN', status: 403, message, operation })
}

export function requirePermission(user: User, permission: Permission, operation: string): void {
  if (!hasPermission(user.role, permission)) throw forbidden(operation)
}

/** Entités de l'organisation de l'utilisateur auxquelles il a accès. */
export function accessibleEntityIds(ctx: MockContext, user: User): Set<Id> {
  return new Set(
    ctx.db.entities
      .filter((e) => e.organizationId === user.organizationId && canAccessEntity(user, e.id))
      .map((e) => e.id),
  )
}

/** Vérifie l'accès à une entité demandée explicitement (filtre `entityId`). */
export function assertEntityAccess(
  ctx: MockContext,
  user: User,
  entityId: Id,
  operation: string,
): void {
  if (!accessibleEntityIds(ctx, user).has(entityId)) {
    throw forbidden(operation, "Vous n'avez pas accès à cette entité.")
  }
}

/** `admin` et `finance` voient toute l'organisation (et seuls eux voient le consolidé complet). */
export function hasFullAccess(user: User): boolean {
  return user.role === 'admin' || user.role === 'finance'
}

/** Entités imputées d'une transaction (allocations explicites, sinon l'entité payeuse). */
export function imputedEntityIds(ctx: MockContext, tx: BankTransaction): Id[] {
  const explicit = ctx.db.allocations.filter((a) => a.transactionId === tx.id)
  return explicit.length > 0 ? [...new Set(explicit.map((a) => a.entityId))] : [tx.entityId]
}

/**
 * Filtre `entityId` des listes (arbitrage D7 précisé, QA-05) : la transaction est PAYÉE par
 * cette entité OU une part lui est IMPUTÉE. Même résultat quel que soit le rôle.
 */
export function transactionConcernsEntity(
  ctx: MockContext,
  tx: BankTransaction,
  entityId: Id,
): boolean {
  return tx.entityId === entityId || imputedEntityIds(ctx, tx).includes(entityId)
}

/** Porteur de la carte d'une transaction (null si pas de carte). */
export function cardHolderId(ctx: MockContext, tx: BankTransaction): Id | null {
  if (!tx.cardId) return null
  return ctx.db.cards.find((c) => c.id === tx.cardId)?.holderUserId ?? null
}

/**
 * Visibilité d'une transaction (D7 précisé, H5 remplacée — QA-20) :
 * - `admin` / `finance` : toute l'organisation ;
 * - `manager` : payée par OU imputée à une de ses entités ;
 * - `member` : uniquement les transactions de SES cartes (pas les dépenses de ses collègues).
 */
export function isTransactionVisible(ctx: MockContext, user: User, tx: BankTransaction): boolean {
  const entities = accessibleEntityIds(ctx, user)
  if (user.role === 'member') return cardHolderId(ctx, tx) === user.id
  if (entities.has(tx.entityId)) return true
  return imputedEntityIds(ctx, tx).some((e) => entities.has(e))
}

/** Transaction confirmée comme paiement de la facture (au plus une, D6). */
export function confirmedTransactionOf(ctx: MockContext, invoiceId: Id): BankTransaction | null {
  const rec = ctx.db.reconciliations.find(
    (r) => r.invoiceId === invoiceId && r.status === 'confirmed',
  )
  return rec ? (ctx.db.transactions.find((t) => t.id === rec.transactionId) ?? null) : null
}

/**
 * Visibilité d'une facture : son entité est accessible OU sa transaction rapprochée (confirmée)
 * est visible. Un `member` ne voit que les factures payées par ses cartes.
 */
export function isInvoiceVisible(ctx: MockContext, user: User, invoice: Invoice): boolean {
  if (invoice.organizationId !== user.organizationId) return false
  const tx = confirmedTransactionOf(ctx, invoice.id)
  if (user.role === 'member') return !!tx && isTransactionVisible(ctx, user, tx)
  if (accessibleEntityIds(ctx, user).has(invoice.entityId)) return true
  return !!tx && isTransactionVisible(ctx, user, tx)
}

/** Filtre `entityId` des factures : entité destinataire OU entité imputée de son paiement. */
export function invoiceConcernsEntity(ctx: MockContext, invoice: Invoice, entityId: Id): boolean {
  if (invoice.entityId === entityId) return true
  const tx = confirmedTransactionOf(ctx, invoice.id)
  return !!tx && transactionConcernsEntity(ctx, tx, entityId)
}

/**
 * Peut-on afficher NOMINATIVEMENT (collaborateur, carte) la dépense d'un porteur ?
 * admin / finance : oui ; manager : si le porteur est membre d'une de ses entités ;
 * member : seulement lui-même (QA-20).
 */
export function canSeeHolder(ctx: MockContext, user: User, holderId: Id): boolean {
  if (hasFullAccess(user)) return true
  if (user.role === 'member') return holderId === user.id
  const entities = accessibleEntityIds(ctx, user)
  const holder = ctx.db.users.find((u) => u.id === holderId)
  return !!holder && holder.entityIds.some((e) => entities.has(e))
}

export function paginate<T>(items: readonly T[], query: PageQuery = {}): Page<T> {
  const pageSize = Math.max(1, Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, 200))
  const page = Math.max(1, query.page ?? 1)
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

export function includesText(
  haystack: readonly (string | null | undefined)[],
  needle?: string,
): boolean {
  if (!needle) return true
  const n = needle.toLocaleLowerCase('fr')
  return haystack.some((h) => h?.toLocaleLowerCase('fr').includes(n))
}
