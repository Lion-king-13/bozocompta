import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const reconciliationsRoutes: RouteRecordRaw[] = [
  {
    path: 'rapprochements',
    name: RouteName.Reconciliations,
    component: () => import('./views/ReconciliationListView.vue'),
    meta: { title: 'Rapprochements', permission: 'reconciliations:read' },
  },
]
