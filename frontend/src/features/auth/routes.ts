import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: 'connexion',
    name: RouteName.Login,
    component: () => import('./views/LoginView.vue'),
    meta: { title: 'Connexion', guestOnly: true },
  },
  {
    path: 'inscription',
    name: RouteName.SignUp,
    component: () => import('./views/SignUpView.vue'),
    meta: { title: 'Inscription', guestOnly: true },
  },
]
