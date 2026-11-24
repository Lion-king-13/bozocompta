import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const errorRoutes: RouteRecordRaw[] = [
  {
    path: 'acces-refuse',
    name: RouteName.Forbidden,
    component: () => import('./views/ForbiddenView.vue'),
    meta: { title: 'Accès refusé' },
  },
]

export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: RouteName.NotFound,
  component: () => import('./views/NotFoundView.vue'),
  meta: { title: 'Page introuvable' },
}
