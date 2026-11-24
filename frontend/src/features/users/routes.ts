import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const usersRoutes: RouteRecordRaw[] = [
  {
    path: 'collaborateurs',
    name: RouteName.Users,
    component: () => import('./views/UserListView.vue'),
    meta: { title: 'Collaborateurs', permission: 'users:read' },
  },
  {
    path: 'collaborateurs/:userId',
    name: RouteName.UserDetail,
    component: () => import('./views/UserDetailView.vue'),
    meta: { title: 'Détail collaborateur', permission: 'users:read' },
  },
]
