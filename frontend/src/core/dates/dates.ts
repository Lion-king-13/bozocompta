/**
 * Dates « calendaires » manipulées comme chaînes ISO `YYYY-MM-DD` (sans fuseau horaire).
 * On évite `new Date()` implicite dans la logique métier pour garder des résultats
 * déterministes (tests, jeu de données mock).
 */

/** Date calendaire `YYYY-MM-DD`. */
export type IsoDate = string
/** Horodatage ISO 8601 complet, en UTC. Ex. `2026-11-20T09:30:00Z`. */
export type IsoDateTime = string

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toISOString().slice(0, 10) === value
}

function toUtcDate(date: IsoDate): Date {
  if (!isIsoDate(date)) throw new Error(`Date ISO invalide : ${date}`)
  return new Date(`${date}T00:00:00Z`)
}

function fromUtcDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtcDate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtcDate(d)
}

/**
 * Ajoute des mois en restant sur le dernier jour du mois si besoin.
 * Ex. 2026-01-31 + 1 mois → 2026-02-28.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = toUtcDate(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return fromUtcDate(d)
}

/** Les chaînes ISO se comparent dans l'ordre lexicographique. */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** `start` et `end` inclus. */
export function isWithin(date: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return date >= start && date <= end
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000)
}

/** Ex. `2026-11-20` → « 20/11/2026 ». */
export function formatIsoDate(date: IsoDate, locale = 'fr-BE'): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(toUtcDate(date))
}

/** Période calendaire inclusive. */
export interface DateRange {
  start: IsoDate
  end: IsoDate
}
