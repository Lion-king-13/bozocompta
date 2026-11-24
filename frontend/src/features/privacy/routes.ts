import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

/** Page publique : confidentialité et transparence IA. */
export const privacyPublicRoutes: RouteRecordRaw[] = [
  {
    path: 'confidentialite',
    name: RouteName.PublicPrivacy,
    component: () => import('./views/PublicPrivacyView.vue'),
    meta: { title: 'Confidentialité et transparence IA' },
  },
]

/** Page authentifiée : export et suppression des données. */
export const privacyAppRoutes: RouteRecordRaw[] = [
  {
    path: 'confidentialite',
    name: RouteName.PrivacySettings,
    component: () => import('./views/PrivacySettingsView.vue'),
    meta: { title: 'Confidentialité et données', permission: 'privacy:self' },
  },
]
