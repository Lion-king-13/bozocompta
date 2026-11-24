import type { IconName } from '@/components/ui/icons'
import type { Permission } from '@/domain'
import { RouteName, type RouteNameValue } from '@/router/routeNames'

/**
 * Menu de l'application, regroupé par thème. Chaque entrée est masquée si l'utilisateur n'a pas
 * la permission indiquée (confort d'affichage : la garde de route et le backend refusent aussi).
 * Les imports PDF / CSV ne sont pas dans le menu : on y accède depuis Factures et Transactions.
 */
export interface NavItem {
  label: string
  route: RouteNameValue
  icon: IconName
  permission?: Permission
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      {
        label: 'Tableau de bord',
        route: RouteName.OrganizationDashboard,
        icon: 'dashboard',
        permission: 'dashboard:read',
      },
      {
        label: 'Analyses IA',
        route: RouteName.AiInsights,
        icon: 'sparkle',
        permission: 'ai-insights:read',
      },
    ],
  },
  {
    label: 'Dépenses',
    items: [
      {
        label: 'Factures',
        route: RouteName.Invoices,
        icon: 'receipt',
        permission: 'invoices:read',
      },
      {
        label: 'Transactions',
        route: RouteName.Transactions,
        icon: 'transactions',
        permission: 'transactions:read',
      },
      {
        label: 'Rapprochements',
        route: RouteName.Reconciliations,
        icon: 'link',
        permission: 'reconciliations:read',
      },
      {
        label: 'Justificatifs manquants',
        route: RouteName.MissingReceipts,
        icon: 'paperclip',
        permission: 'transactions:read',
      },
      {
        label: 'Allocations',
        route: RouteName.Allocations,
        icon: 'split',
        permission: 'allocations:read',
      },
    ],
  },
  {
    label: 'Budgets',
    items: [
      { label: 'Budgets', route: RouteName.Budgets, icon: 'wallet', permission: 'budgets:read' },
      {
        label: 'Abonnements et échéances',
        route: RouteName.Subscriptions,
        icon: 'repeat',
        permission: 'subscriptions:read',
      },
    ],
  },
  {
    label: 'Référentiels',
    items: [
      { label: 'Cartes', route: RouteName.Cards, icon: 'card', permission: 'cards:read' },
      { label: 'Collaborateurs', route: RouteName.Users, icon: 'users', permission: 'users:read' },
      {
        label: 'Catégories',
        route: RouteName.Categories,
        icon: 'tag',
        permission: 'categories:read',
      },
      {
        label: 'Centres de coûts',
        route: RouteName.CostCenters,
        icon: 'target',
        permission: 'cost-centers:read',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Consommation IA',
        route: RouteName.AiUsage,
        icon: 'bolt',
        permission: 'ai-usage:read',
      },
      {
        label: 'Confidentialité',
        route: RouteName.PrivacySettings,
        icon: 'shield',
        permission: 'privacy:self',
      },
      { label: 'Paramètres', route: RouteName.Settings, icon: 'settings' },
    ],
  },
]

/** Liste à plat (compatibilité avec le premier layout). */
export const NAVIGATION: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

/** Groupes visibles pour un utilisateur donné (groupes vides retirés). */
export function visibleNavGroups(can: (permission: Permission) => boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0)
}
