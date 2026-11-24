import { DEMO_TODAY } from '@/config/demo'
import { daysBetween } from '@/core/dates/dates'
import type { Tone } from '@/components/ui'
import type { Cents, DueItem, RecurrenceFrequency, RecurringSubscription } from '@/domain'

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
}

const RENEWALS_PER_YEAR: Record<RecurrenceFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}

/** Coût annualisé = montant d'un renouvellement × nombre de renouvellements par an (exact). */
export function annualCostCents(
  sub: Pick<RecurringSubscription, 'amountCents' | 'frequency'>,
): Cents {
  return sub.amountCents * RENEWALS_PER_YEAR[sub.frequency]
}

/** Une échéance est « proche » à 7 jours ou moins de la date de démo. */
export const DUE_SOON_DAYS = 7

export interface DueGroup {
  id: 'overdue' | 'soon' | 'later'
  title: string
  items: DueItem[]
}

/** Regroupe les échéances : en retard, dans les 7 jours, plus tard (relatif à DEMO_TODAY). */
export function groupDueItems(items: readonly DueItem[], today = DEMO_TODAY): DueGroup[] {
  const groups: DueGroup[] = [
    { id: 'overdue', title: 'En retard', items: [] },
    { id: 'soon', title: `Dans les ${DUE_SOON_DAYS} prochains jours`, items: [] },
    { id: 'later', title: 'Plus tard', items: [] },
  ]
  for (const item of items) {
    const days = daysBetween(today, item.dueDate)
    const group = item.overdue || days < 0 ? 0 : days <= DUE_SOON_DAYS ? 1 : 2
    groups[group]!.items.push(item)
  }
  return groups.filter((g) => g.items.length > 0)
}

/** Badge d'une échéance : couleur + icône + texte (jamais la couleur seule). */
export function dueBadge(
  item: DueItem,
  today = DEMO_TODAY,
): { tone: Tone; label: string; icon: 'alert-circle' | 'calendar' } {
  const days = daysBetween(today, item.dueDate)
  if (item.overdue || days < 0)
    return { tone: 'danger', label: `En retard de ${Math.abs(days)} j`, icon: 'alert-circle' }
  if (days === 0) return { tone: 'warning', label: "Aujourd'hui", icon: 'calendar' }
  if (days <= DUE_SOON_DAYS) return { tone: 'warning', label: `Dans ${days} j`, icon: 'calendar' }
  return { tone: 'neutral', label: `Dans ${days} j`, icon: 'calendar' }
}
