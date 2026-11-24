import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@/router/routeNames'

export const invoicesRoutes: RouteRecordRaw[] = [
  {
    path: 'factures',
    name: RouteName.Invoices,
    component: () => import('./views/InvoiceListView.vue'),
    meta: { title: 'Factures', permission: 'invoices:read' },
  },
  {
    path: 'factures/import',
    name: RouteName.InvoiceImport,
    component: () => import('./views/InvoiceImportView.vue'),
    meta: { title: 'Import PDF', permission: 'invoices:import' },
  },
  {
    path: 'factures/:invoiceId',
    name: RouteName.InvoiceDetail,
    component: () => import('./views/InvoiceDetailView.vue'),
    meta: { title: 'Détail facture', permission: 'invoices:read' },
  },
]
