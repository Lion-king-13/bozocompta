import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const cardsRoutes: RouteRecordRaw[] = [
  {
    path: 'cartes',
    name: RouteName.Cards,
    component: () => import('./views/CardListView.vue'),
    meta: { title: 'Cartes', permission: 'cards:read' },
  },
]
