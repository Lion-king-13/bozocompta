import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const aiInsightsRoutes: RouteRecordRaw[] = [
  {
    path: 'analyses-ia',
    name: RouteName.AiInsights,
    component: () => import('./views/AiInsightListView.vue'),
    meta: { title: 'Analyses IA', permission: 'ai-insights:read' },
  },
]
