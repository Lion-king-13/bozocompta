import type { RouteRecordRaw } from 'vue-router'
import { aiInsightsRoutes } from '@/features/ai-insights/routes'
import { aiUsageRoutes } from '@/features/ai-usage/routes'
import { allocationsRoutes } from '@/features/allocations/routes'
import { authRoutes } from '@/features/auth/routes'
import { budgetsRoutes } from '@/features/budgets/routes'
import { cardsRoutes } from '@/features/cards/routes'
import { categoriesRoutes } from '@/features/categories/routes'
import { costCentersRoutes } from '@/features/cost-centers/routes'
import { dashboardRoutes } from '@/features/dashboard/routes'
import { errorRoutes, notFoundRoute } from '@/features/errors/routes'
import { invoicesRoutes } from '@/features/invoices/routes'
import { landingRoutes } from '@/features/landing/routes'
import { privacyAppRoutes, privacyPublicRoutes } from '@/features/privacy/routes'
import { reconciliationsRoutes } from '@/features/reconciliations/routes'
import { settingsRoutes } from '@/features/settings/routes'
import { subscriptionsRoutes } from '@/features/subscriptions/routes'
import { transactionsRoutes } from '@/features/transactions/routes'
import { usersRoutes } from '@/features/users/routes'

/**
 * Assemblage des routes. Chaque domaine déclare SES routes dans `features/<domaine>/routes.ts`
 * (vues chargées en lazy-loading) : les équipes travaillent en parallèle sans toucher ce fichier.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [...landingRoutes, ...authRoutes, ...privacyPublicRoutes, ...errorRoutes],
  },
  {
    path: '/app',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      ...dashboardRoutes,
      ...invoicesRoutes,
      ...transactionsRoutes,
      ...reconciliationsRoutes,
      ...allocationsRoutes,
      ...cardsRoutes,
      ...usersRoutes,
      ...categoriesRoutes,
      ...costCentersRoutes,
      ...budgetsRoutes,
      ...subscriptionsRoutes,
      ...aiInsightsRoutes,
      ...aiUsageRoutes,
      ...settingsRoutes,
      ...privacyAppRoutes,
    ],
  },
  notFoundRoute,
]
