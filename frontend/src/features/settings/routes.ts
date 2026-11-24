import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: 'parametres',
    name: RouteName.Settings,
    component: () => import('./views/SettingsView.vue'),
    meta: { title: 'Paramètres' },
  },
]
