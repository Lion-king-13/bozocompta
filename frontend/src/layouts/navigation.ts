import type { Permission } from '@/domain'
import { RouteName, type RouteNameValue } from '@/router/routeNames'

/** Entrées du menu de l'application, filtrées selon les permissions (affichage seulement). */
export interface NavItem {
  label: string
  route: RouteNameValue
  permission?: Permission
}

export const NAVIGATION: NavItem[] = [
  {
    label: 'Tableau de bord',
    route: RouteName.OrganizationDashboard,
    permission: 'dashboard:read',
  },
  { label: 'Factures', route: RouteName.Invoices, permission: 'invoices:read' },
  { label: 'Import PDF', route: RouteName.InvoiceImport, permission: 'invoices:import' },
  { label: 'Transactions', route: RouteName.Transactions, permission: 'transactions:read' },
  { label: 'Import CSV', route: RouteName.TransactionImport, permission: 'transactions:import' },
  {
    label: 'Justificatifs manquants',
    route: RouteName.MissingReceipts,
    permission: 'transactions:read',
  },
  { label: 'Rapprochements', route: RouteName.Reconciliations, permission: 'reconciliations:read' },
  { label: 'Allocations', route: RouteName.Allocations, permission: 'allocations:read' },
  { label: 'Cartes', route: RouteName.Cards, permission: 'cards:read' },
  { label: 'Collaborateurs', route: RouteName.Users, permission: 'users:read' },
  { label: 'Catégories', route: RouteName.Categories, permission: 'categories:read' },
  { label: 'Centres de coûts', route: RouteName.CostCenters, permission: 'cost-centers:read' },
  { label: 'Budgets', route: RouteName.Budgets, permission: 'budgets:read' },
  {
    label: 'Abonnements et échéances',
    route: RouteName.Subscriptions,
    permission: 'subscriptions:read',
  },
  { label: 'Analyses IA', route: RouteName.AiInsights, permission: 'ai-insights:read' },
  { label: 'Consommation IA', route: RouteName.AiUsage, permission: 'ai-usage:read' },
  { label: 'Confidentialité', route: RouteName.PrivacySettings, permission: 'privacy:self' },
  { label: 'Paramètres', route: RouteName.Settings },
]
