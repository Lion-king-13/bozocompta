import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const aiUsageRoutes: RouteRecordRaw[] = [
  {
    path: 'consommation-ia',
    name: RouteName.AiUsage,
    component: () => import('./views/AiUsageView.vue'),
    meta: { title: 'Consommation IA', permission: 'ai-usage:read' },
  },
]
