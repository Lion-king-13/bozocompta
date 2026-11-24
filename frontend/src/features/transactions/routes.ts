import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const transactionsRoutes: RouteRecordRaw[] = [
  {
    path: 'transactions',
    name: RouteName.Transactions,
    component: () => import('./views/TransactionListView.vue'),
    meta: { title: 'Transactions', permission: 'transactions:read' },
  },
  {
    path: 'transactions/import',
    name: RouteName.TransactionImport,
    component: () => import('./views/TransactionImportView.vue'),
    meta: { title: 'Import CSV', permission: 'transactions:import' },
  },
  {
    path: 'justificatifs-manquants',
    name: RouteName.MissingReceipts,
    component: () => import('./views/MissingReceiptsView.vue'),
    meta: { title: 'Justificatifs manquants', permission: 'transactions:read' },
  },
]
