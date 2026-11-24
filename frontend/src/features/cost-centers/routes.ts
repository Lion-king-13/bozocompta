import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const costCentersRoutes: RouteRecordRaw[] = [
  {
    path: 'centres-de-couts',
    name: RouteName.CostCenters,
    component: () => import('./views/CostCenterListView.vue'),
    meta: { title: 'Centres de coûts', permission: 'cost-centers:read' },
  },
]
