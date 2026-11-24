import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const allocationsRoutes: RouteRecordRaw[] = [
  {
    path: 'allocations',
    name: RouteName.Allocations,
    component: () => import('./views/AllocationListView.vue'),
    meta: { title: 'Allocations analytiques', permission: 'allocations:read' },
  },
  {
    path: 'allocations/:transactionId',
    name: RouteName.AllocationEditor,
    component: () => import('./views/AllocationEditorView.vue'),
    meta: { title: 'Répartition analytique', permission: 'allocations:read' },
  },
]
