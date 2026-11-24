import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: RouteName.OrganizationDashboard,
    component: () => import('./views/OrganizationDashboardView.vue'),
    meta: { title: 'Tableau de bord', permission: 'dashboard:read' },
  },
  {
    path: 'entites/:entityId',
    name: RouteName.EntityDashboard,
    component: () => import('./views/EntityDashboardView.vue'),
    meta: { title: 'Tableau de bord entité', permission: 'dashboard:read' },
  },
]
