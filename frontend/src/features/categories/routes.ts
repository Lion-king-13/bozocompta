import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const categoriesRoutes: RouteRecordRaw[] = [
  {
    path: 'categories',
    name: RouteName.Categories,
    component: () => import('./views/CategoryListView.vue'),
    meta: { title: 'Catégories', permission: 'categories:read' },
  },
]
