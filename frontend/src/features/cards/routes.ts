import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const cardsRoutes: RouteRecordRaw[] = [
  {
    path: 'cartes',
    name: RouteName.Cards,
    component: () => import('./views/CardListView.vue'),
    meta: { title: 'Cartes', permission: 'cards:read' },
  },
  {
    path: 'cartes/:cardId',
    name: RouteName.CardDetail,
    component: () => import('./views/CardDetailView.vue'),
    meta: { title: 'Détail carte', permission: 'cards:read' },
  },
]
