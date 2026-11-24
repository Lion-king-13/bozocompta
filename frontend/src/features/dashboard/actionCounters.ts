import type { IconName } from '@/components/ui'
import type { BankTransactionQuery, DateRange, Id, Permission } from '@/domain'
import { RouteName, type RouteNameValue } from '@/router/routeNames'
import type { Services } from '@/services'

/**
 * Compteurs « À traiter » des tableaux de bord.
 *
 * Règle : le nombre affiché EST la longueur de la liste vers laquelle mène le lien. On appelle
 * donc la même méthode de service que l'écran cible, avec les mêmes filtres (et on passe ces
 * filtres dans la query du lien). Ainsi le compteur et la liste ne peuvent pas diverger.
 */
export interface ActionCounterDef {
  id: 'invoices' | 'reconciliations' | 'missing' | 'insights'
  label: string
  icon: IconName
  permission: Permission
  route: RouteNameValue
  query(entityId: Id | null): Record<string, string | undefined>
  count(services: Services, entityId: Id | null): Promise<number>
}

const scope = (entityId: Id | null): { entityId?: Id } => (entityId ? { entityId } : {})

/**
 * Filtres de la liste des transactions derrière le KPI « Dépenses » : débits de la période,
 * de l'entité le cas échéant (payées par OU imputées à, D7). Mêmes noms que `BankTransactionQuery`.
 */
export function spendTransactionsQuery(
  entityId: Id | null,
  period: DateRange,
): Pick<BankTransactionQuery, 'direction' | 'bookedFrom' | 'bookedTo' | 'entityId'> {
  return { direction: 'debit', bookedFrom: period.start, bookedTo: period.end, ...scope(entityId) }
}

export const ACTION_COUNTERS: ActionCounterDef[] = [
  {
    id: 'invoices',
    label: 'Factures à valider',
    icon: 'receipt',
    permission: 'invoices:read',
    route: RouteName.Invoices,
    query: (entityId) => ({ status: 'to_review', ...scope(entityId) }),
    count: async (s, entityId) =>
      (await s.invoices.listInvoices({ status: 'to_review', pageSize: 1, ...scope(entityId) }))
        .total,
  },
  {
    id: 'reconciliations',
    label: 'Rapprochements en attente',
    icon: 'link',
    permission: 'reconciliations:read',
    route: RouteName.Reconciliations,
    query: (entityId) => ({ status: 'suggested', ...scope(entityId) }),
    count: async (s, entityId) =>
      (await s.reconciliations.listReconciliations({ status: 'suggested', ...scope(entityId) }))
        .length,
  },
  {
    id: 'missing',
    label: 'Justificatifs manquants',
    icon: 'paperclip',
    permission: 'transactions:read',
    route: RouteName.MissingReceipts,
    query: (entityId) => scope(entityId),
    count: async (s, entityId) =>
      (await s.transactions.listMissingReceipts(scope(entityId))).length,
  },
  {
    id: 'insights',
    label: 'Suggestions IA ouvertes',
    icon: 'lightbulb',
    permission: 'ai-insights:read',
    route: RouteName.AiInsights,
    query: (entityId) => ({ status: 'open', ...scope(entityId) }),
    count: async (s, entityId) =>
      (await s.aiInsights.listInsights({ status: 'open', ...scope(entityId) })).length,
  },
]
