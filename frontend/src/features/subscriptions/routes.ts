import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const subscriptionsRoutes: RouteRecordRaw[] = [
  {
    path: 'abonnements',
    name: RouteName.Subscriptions,
    component: () => import('./views/SubscriptionListView.vue'),
    meta: { title: 'Abonnements et échéances', permission: 'subscriptions:read' },
  },
]
