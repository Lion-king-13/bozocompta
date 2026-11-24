import type { Role } from '@/domain'

/**
 * Résumé lisible de ce que chaque rôle simulé peut faire (d'après la matrice PROVISOIRE
 * `domain/permissions.ts`). Affiché sur la connexion de démonstration et dans les paramètres.
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:
    'Tous les droits sur toutes les entités, y compris la gestion des membres et la suppression des données de l’organisation.',
  finance: 'Factures, transactions, rapprochements, allocations et budgets de toutes les entités.',
  manager: 'Consultation de ses entités et confirmation des rapprochements.',
  member: 'Ses cartes, ses transactions et le tableau de bord de ses entités.',
}

/** Ordre d'affichage des rôles (du plus large au plus restreint). */
export const ROLE_ORDER: Role[] = ['admin', 'finance', 'manager', 'member']
