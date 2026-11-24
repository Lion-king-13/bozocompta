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

/**
 * Une transaction est visible si son entité payeuse OU une entité à laquelle elle est
 * imputée est accessible (arbitrage D7).
 */
export function isTransactionVisible(ctx: MockContext, user: User, tx: BankTransaction): boolean {
  const entities = accessibleEntityIds(ctx, user)
  if (entities.has(tx.entityId)) return true
  return ctx.db.allocations.some((a) => a.transactionId === tx.id && entities.has(a.entityId))
}

/** Une facture est visible si son entité OU sa transaction rapprochée (confirmée) est visible. */
export function isInvoiceVisible(ctx: MockContext, user: User, invoice: Invoice): boolean {
  if (invoice.organizationId !== user.organizationId) return false
  if (accessibleEntityIds(ctx, user).has(invoice.entityId)) return true
  return ctx.db.reconciliations.some((r) => {
    if (r.invoiceId !== invoice.id || r.status !== 'confirmed') return false
    const tx = ctx.db.transactions.find((t) => t.id === r.transactionId)
    return !!tx && isTransactionVisible(ctx, user, tx)
  })
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
