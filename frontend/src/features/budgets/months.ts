import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { addMonths } from '@/core/dates/dates'
import { monthLabel } from '@/features/dashboard/period'

/** Mois proposés pour les budgets : 4 mois avant et 2 mois après le mois de démo. */
export function monthOptions(center = DEMO_CURRENT_MONTH): { value: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const month = addMonths(`${center}-01`, i - 4).slice(0, 7)
    const label = monthLabel(month)
    return { value: month, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })
}
