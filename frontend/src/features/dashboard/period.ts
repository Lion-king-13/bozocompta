import { DEMO_TODAY } from '@/config/demo'
import { addMonths, formatIsoDate, isIsoDate, type DateRange } from '@/core/dates/dates'

/**
 * Périodes des tableaux de bord, toutes relatives à l'horloge de démo figée (DEMO_TODAY),
 * jamais à `new Date()` : la démo et les tests donnent toujours les mêmes chiffres.
 */
export type PeriodPreset = 'mois' | 'trimestre' | 'annee' | 'perso'

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'mois', label: 'Mois en cours' },
  { value: 'trimestre', label: 'Trimestre en cours' },
  { value: 'annee', label: 'Année à date' },
  { value: 'perso', label: 'Période personnalisée' },
]

/** Hypothèse H8 : par défaut, du 1er janvier à la date de démo. */
export const DEFAULT_PRESET = 'annee' as const

export function presetRange(preset: Exclude<PeriodPreset, 'perso'>, today = DEMO_TODAY): DateRange {
  const year = today.slice(0, 4)
  const month = Number(today.slice(5, 7))
  if (preset === 'mois') return { start: `${today.slice(0, 7)}-01`, end: today }
  if (preset === 'trimestre') {
    const first = Math.floor((month - 1) / 3) * 3 + 1
    return { start: `${year}-${String(first).padStart(2, '0')}-01`, end: today }
  }
  return { start: `${year}-01-01`, end: today }
}

/** Lit la période depuis la query de l'URL (`?periode=perso&du=…&au=…`). */
export function periodFromQuery(query: Record<string, unknown>): {
  preset: PeriodPreset
  range: DateRange
} {
  const preset = PERIOD_OPTIONS.some((o) => o.value === query.periode)
    ? (query.periode as PeriodPreset)
    : DEFAULT_PRESET
  if (preset !== 'perso') return { preset, range: presetRange(preset) }
  const du = typeof query.du === 'string' && isIsoDate(query.du) ? query.du : null
  const au = typeof query.au === 'string' && isIsoDate(query.au) ? query.au : null
  if (!du || !au || du > au) return { preset: DEFAULT_PRESET, range: presetRange(DEFAULT_PRESET) }
  return { preset, range: { start: du, end: au } }
}

/** Liste des mois `YYYY-MM` couverts par la période (pour l'axe de l'évolution). */
export function monthsInRange(range: DateRange): string[] {
  const months: string[] = []
  let cursor = `${range.start.slice(0, 7)}-01`
  const last = range.end.slice(0, 7)
  while (cursor.slice(0, 7) <= last && months.length < 120) {
    months.push(cursor.slice(0, 7))
    cursor = addMonths(cursor, 1)
  }
  return months
}

const MONTH_FORMAT = {
  short: new Intl.DateTimeFormat('fr-BE', { month: 'short', timeZone: 'UTC' }),
  long: new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
}

/** « nov. » (court) ou « novembre 2026 » (long). */
export function monthLabel(month: string, style: 'short' | 'long' = 'long'): string {
  return MONTH_FORMAT[style].format(new Date(`${month}-01T00:00:00Z`))
}

/** « 01/09/2026 » → « 2026-09-01 » ; `null` si le texte n'est pas une date valide. */
export function parseFrenchDate(text: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text)
  if (!m) return null
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  return isIsoDate(iso) ? iso : null
}

export function describeRange(range: DateRange): string {
  return `du ${formatIsoDate(range.start)} au ${formatIsoDate(range.end)}`
}
