import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Pour qui le tableau de bord est-il affiché ? Les libellés en dépendent (QA-03, QA-20) :
 * - `organization` (admin, finance) : consolidé de TOUTE l'organisation ;
 * - `entities` (manager) : « Toutes mes entités » = somme de ses tableaux de bord d'entité ;
 *   les parts imputées à d'autres entités ne sont pas comptées ;
 * - `personal` (member) : uniquement ses propres dépenses (cartes à son nom).
 * Règles appliquées par le service ; ici on ne fait que choisir les bons textes.
 */
export type DashboardAudience = 'organization' | 'entities' | 'personal'

export function audienceOf(role: string | null): DashboardAudience {
  if (role === 'admin' || role === 'finance') return 'organization'
  if (role === 'member') return 'personal'
  return 'entities'
}

export const SCOPE_ALL_LABEL: Record<DashboardAudience, string> = {
  organization: 'Organisation consolidée',
  entities: 'Toutes mes entités',
  personal: 'Toutes mes entités',
}

export function useDashboardAudience() {
  const auth = useAuthStore()
  return computed(() => audienceOf(auth.role))
}
