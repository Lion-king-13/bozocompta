import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import type { Permission } from '@/domain'
import { useAuthStore } from '@/stores/auth'
import { useDemoModeStore } from '@/stores/demoMode'
import { RouteName } from './routeNames'

/** Ce dont la garde a besoin de l'état d'authentification (facile à simuler en test). */
export interface AuthSnapshot {
  isAuthenticated: boolean
  can(permission: Permission): boolean
}

/**
 * Décision de navigation — fonction PURE (testée unitairement).
 * - route protégée sans session → page de connexion, avec `redirect` ;
 * - permission manquante → page « Accès refusé » (gestion visuelle des permissions) ;
 * - page invité (connexion) alors qu'on est connecté → tableau de bord.
 * ⚠ Confort d'affichage uniquement : le backend doit refuser lui-même (403).
 */
export function resolveNavigation(
  to: RouteLocationNormalized,
  auth: AuthSnapshot,
): true | RouteLocationRaw {
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: RouteName.Login, query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: RouteName.OrganizationDashboard }
  }
  const permission = [...to.matched].reverse().find((r) => r.meta.permission)?.meta.permission
  if (permission && !auth.can(permission)) {
    return { name: RouteName.Forbidden, query: { from: to.fullPath } }
  }
  return true
}

export function installGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.ensureRestored()
    // Après la restauration de session, pour qu'une erreur simulée ne déconnecte pas.
    useDemoModeStore().applyFromQuery(to.query)
    return resolveNavigation(to, auth)
  })
  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} — CashLens` : 'CashLens'
  })
}
