import { addMonths } from '@/core/dates/dates'
import { divideRounded } from '@/core/money'
import type { Cents, DateRange, IsoDate } from '../common'
import type { Invoice } from '../invoice'
import type { DueItem, RecurrenceFrequency, RecurringSubscription } from '../subscription'

const MONTHS: Record<RecurrenceFrequency, number> = { monthly: 1, quarterly: 3, yearly: 12 }

const UNPAID_STATUSES: Invoice['status'][] = ['to_review', 'approved', 'disputed']

/**
 * Échéances de la période (bornes incluses) : renouvellements des abonnements actifs et dates
 * limites des factures non payées. `today` = horloge de démo (DEMO_TODAY), pour `overdue`.
 * Les factures en retard (date limite < début de période) sont incluses aussi.
 */
export function computeDueItems(
  subscriptions: readonly RecurringSubscription[],
  invoices: readonly Invoice[],
  range: DateRange,
  today: IsoDate,
): DueItem[] {
  const items: DueItem[] = []
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    for (let step = 0; ; step++) {
      const due = addMonths(sub.nextRenewalDate, MONTHS[sub.frequency] * step)
      if (due > range.end) break
      if (due >= range.start) {
        items.push({
          kind: 'subscription_renewal',
          sourceId: sub.id,
          entityId: sub.entityId,
          label: sub.name,
          dueDate: due,
          amountCents: sub.amountCents,
          overdue: false,
        })
      }
    }
  }
  for (const inv of invoices) {
    if (!UNPAID_STATUSES.includes(inv.status) || inv.dueDate > range.end) continue
    const overdue = inv.dueDate < today
    if (inv.dueDate < range.start && !overdue) continue
    items.push({
      kind: 'invoice_due',
      sourceId: inv.id,
      entityId: inv.entityId,
      label: `Facture ${inv.number}`,
      dueDate: inv.dueDate,
      amountCents: inv.totalInclVatCents,
      overdue,
    })
  }
  return items.sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.sourceId.localeCompare(b.sourceId),
  )
}

/** Coût mensuel équivalent d'un abonnement (centimes, arrondi commercial). */
export function monthlyEquivalentCents(
  sub: Pick<RecurringSubscription, 'amountCents' | 'frequency'>,
): Cents {
  return divideRounded(sub.amountCents, MONTHS[sub.frequency])
}
