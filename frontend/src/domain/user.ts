import type { Id } from './common'

/**
 * Rôles SIMULÉS provisoires (arbitrage D7, à confirmer avec la partie A) :
 * - `admin` : administrateur de l'organisation, tous droits, toutes les entités ;
 * - `finance` : comptable, gère pièces/rapprochements/allocations de toutes les entités ;
 * - `manager` : responsable d'entité(s), lecture + confirmation sur son périmètre ;
 * - `member` : collaborateur, voit ses cartes et les dépenses de ses entités.
 */
export type Role = 'admin' | 'finance' | 'manager' | 'member'

export const ROLES: readonly Role[] = ['admin', 'finance', 'manager', 'member']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  finance: 'Finance (comptable)',
  manager: "Manager d'entité",
  member: 'Collaborateur',
}

/**
 * Utilisateur / membre de l'organisation. Un collaborateur peut appartenir à PLUSIEURS
 * entités (`entityIds`) et posséder plusieurs cartes (voir `Card.holderUserId`).
 */
export interface User {
  id: Id
  organizationId: Id
  firstName: string
  lastName: string
  email: string
  role: Role
  /** Entités dont l'utilisateur est membre. `admin` et `finance` voient toutes les entités. */
  entityIds: Id[]
  jobTitle: string
  active: boolean
}
