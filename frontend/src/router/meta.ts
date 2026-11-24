import type { Permission } from '@/domain'

declare module 'vue-router' {
  interface RouteMeta {
    /** Titre affiché dans l'onglet. */
    title?: string
    /** true = nécessite une session (positionné sur la route parente `/app`). */
    requiresAuth?: boolean
    /** Permission requise (sinon redirection vers « Accès refusé »). */
    permission?: Permission
    /** Pages réservées aux visiteurs non connectés (connexion, inscription). */
    guestOnly?: boolean
  }
}

export {}
