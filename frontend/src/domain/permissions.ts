import type { Id } from './common'
import type { Role, User } from './user'

/**
 * Matrice rôles → permissions PROVISOIRE (à aligner sur le cahier des charges).
 * Côté front, elle sert UNIQUEMENT à adapter l'interface (menus, boutons, gardes de route).
 * Le contrôle réel des droits est fait par le backend (partie A), qui répond 403 sinon.
 */
export type Permission =
  | 'dashboard:read'
  | 'invoices:read'
  | 'invoices:write'
  | 'invoices:import'
  | 'transactions:read'
  | 'transactions:import'
  | 'transactions:write'
  | 'cards:read'
  | 'cards:manage'
  | 'users:read'
  | 'users:manage'
  | 'reconciliations:read'
  | 'reconciliations:validate'
  | 'allocations:read'
  | 'allocations:write'
  | 'categories:read'
  | 'categories:manage'
  | 'cost-centers:read'
  | 'cost-centers:manage'
  | 'budgets:read'
  | 'budgets:manage'
  | 'subscriptions:read'
  | 'ai-insights:read'
  | 'ai-usage:read'
  | 'settings:manage'
  | 'privacy:self'
  | 'privacy:organization'

const ALL: Permission[] = [
  'dashboard:read',
  'invoices:read',
  'invoices:write',
  'invoices:import',
  'transactions:read',
  'transactions:import',
  'transactions:write',
  'cards:read',
  'cards:manage',
  'users:read',
  'users:manage',
  'reconciliations:read',
  'reconciliations:validate',
  'allocations:read',
  'allocations:write',
  'categories:read',
  'categories:manage',
  'cost-centers:read',
  'cost-centers:manage',
  'budgets:read',
  'budgets:manage',
  'subscriptions:read',
  'ai-insights:read',
  'ai-usage:read',
  'settings:manage',
  'privacy:self',
  'privacy:organization',
]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ALL,
  finance: ALL.filter(
    (p) => !['users:manage', 'settings:manage', 'cards:manage', 'privacy:organization'].includes(p),
  ),
  manager: [
    'dashboard:read',
    'invoices:read',
    'transactions:read',
    'cards:read',
    'users:read',
    'reconciliations:read',
    'reconciliations:validate',
    'allocations:read',
    'categories:read',
    'cost-centers:read',
    'budgets:read',
    'subscriptions:read',
    'ai-insights:read',
    'privacy:self',
  ],
  member: ['dashboard:read', 'cards:read', 'transactions:read', 'privacy:self'],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** `admin` et `finance` voient toutes les entités ; les autres seulement les leurs. */
export function canAccessEntity(user: Pick<User, 'role' | 'entityIds'>, entityId: Id): boolean {
  if (user.role === 'admin' || user.role === 'finance') return true
  return user.entityIds.includes(entityId)
}
