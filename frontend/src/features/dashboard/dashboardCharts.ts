import type { ChartDatum } from '@/components/charts'
import type { DateRange, SpendBreakdownItem, SpendReport } from '@/domain'
import { monthLabel, monthsInRange } from './period'

/**
 * Transforme un `SpendReport` (calcul unique des dépenses) en données de graphiques.
 * AUCUN montant n'est recalculé ici : chaque barre reprend une ligne d'une ventilation du
 * rapport, avec un libellé lisible. La somme des barres d'un graphique est donc égale au
 * total du rapport (vérifié par les tests).
 */
export interface ChartLabels {
  entity(id: string | null): string
  category(id: string | null): string
  costCenter(id: string | null): string
  user(id: string | null): string
  card(id: string | null): string
  entitySlot(id: string): number
}

function toItems(items: SpendBreakdownItem[], label: (id: string | null) => string): ChartDatum[] {
  return items.map((i) => ({ key: i.key ?? 'none', label: label(i.key), value: i.amountCents }))
}

/**
 * « Imputé à » (barre pleine) et « payé par » (barre hachurée) pour chaque entité,
 * dans l'ordre des entités ; même couleur pour une entité, quel que soit son rang.
 */
export function entityBars(
  spend: SpendReport,
  entityIds: string[],
  labels: ChartLabels,
): ChartDatum[] {
  const amount = (items: SpendBreakdownItem[], id: string) =>
    items.find((i) => i.key === id)?.amountCents ?? 0
  return entityIds.flatMap((id) => [
    {
      key: `${id}-imputed`,
      label: labels.entity(id),
      sublabel: 'imputé à',
      value: amount(spend.imputedByEntity, id),
      colorSlot: labels.entitySlot(id),
    },
    {
      key: `${id}-paid`,
      label: labels.entity(id),
      sublabel: 'payé par',
      value: amount(spend.paidByEntity, id),
      colorSlot: labels.entitySlot(id),
      hatched: true,
    },
  ])
}

/** Répartition du total consolidé par entité imputée (barre empilée). */
export function entityShare(spend: SpendReport, labels: ChartLabels): ChartDatum[] {
  return spend.imputedByEntity.map((i) => ({
    key: i.key ?? 'none',
    label: labels.entity(i.key),
    value: i.amountCents,
    colorSlot: i.key ? labels.entitySlot(i.key) : 9,
  }))
}

export function spendBreakdowns(spend: SpendReport, labels: ChartLabels) {
  return {
    byCategory: toItems(spend.byCategory, labels.category),
    byCostCenter: toItems(spend.byCostCenter, labels.costCenter),
    byUser: toItems(spend.byUser, labels.user),
    byCard: toItems(spend.byCard, labels.card),
  }
}

/** Un point par mois de la période (0 si aucune dépense ce mois-là). */
export function monthlyPoints(spend: SpendReport, period: DateRange): ChartDatum[] {
  const byMonth = new Map(spend.byMonth.map((m) => [m.key, m.amountCents]))
  return monthsInRange(period).map((month) => ({
    key: month,
    label: monthLabel(month, 'short'),
    fullLabel: monthLabel(month, 'long'),
    value: byMonth.get(month) ?? 0,
  }))
}
