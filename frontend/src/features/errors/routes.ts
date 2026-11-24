import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

/**
 * Pages d'erreur, déclarées hors des deux coques : `ErrorLayout` choisit la coque applicative
 * pour un utilisateur connecté, la coque publique sinon (QA-13).
 */
export const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/acces-refuse',
    component: () => import('@/layouts/ErrorLayout.vue'),
    children: [
      {
        path: '',
        name: RouteName.Forbidden,
        component: () => import('./views/ForbiddenView.vue'),
        meta: { title: 'Accès refusé' },
      },
    ],
  },
]

export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  component: () => import('@/layouts/ErrorLayout.vue'),
  children: [
    {
      path: '',
      name: RouteName.NotFound,
      component: () => import('./views/NotFoundView.vue'),
      meta: { title: 'Page introuvable' },
    },
  ],
}
