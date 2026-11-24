import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const landingRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: RouteName.Landing,
    component: () => import('./views/LandingView.vue'),
    meta: { title: 'Accueil' },
  },
]
