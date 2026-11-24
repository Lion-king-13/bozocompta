import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const budgetsRoutes: RouteRecordRaw[] = [
  {
    path: 'budgets',
    name: RouteName.Budgets,
    component: () => import('./views/BudgetListView.vue'),
    meta: { title: 'Budgets', permission: 'budgets:read' },
  },
]
