/**
 * Module monétaire unique de CashLens.
 *
 * Règles (à respecter partout dans le frontend) :
 * - Un montant est TOUJOURS un nombre entier de centimes (`Cents`), jamais un flottant en euros.
 *   Ex. 3 000,00 € → 300000.
 * - Un pourcentage ou un taux est TOUJOURS un entier en points de base (`BasisPoints`) :
 *   1 % = 100 bp, 100 % = 10 000 bp. Ex. TVA 21 % → 2100 ; 33,33 % → 3333.
 * - La division en euros (`/ 100`) n'a lieu qu'au moment de l'affichage (`formatCents`).
 * - Toute répartition (TVA, allocations, parts égales) passe par les fonctions ci-dessous
 *   pour garantir qu'aucun centime n'est perdu ni créé.
 */

/** Montant en centimes entiers (peut être négatif : avoir, débit bancaire). */
export type Cents = number

/** Pourcentage en points de base : 1 % = 100, 100 % = 10 000. */
export type BasisPoints = number

export const FULL_PERCENT_BP: BasisPoints = 10_000

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/** Vérifie qu'une valeur est bien un nombre entier de centimes (lève une `MoneyError` sinon). */
export function assertCents(value: number, label = 'montant'): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} doit être un entier de centimes (reçu : ${value})`)
  }
}

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

/** Somme exacte d'une liste de montants en centimes. */
export function sumCents(values: readonly Cents[]): Cents {
  let total = 0
  for (const v of values) {
    assertCents(v)
    total += v
  }
  return total
}

/**
 * Division entière arrondie « au plus proche, moitié loin de zéro » (arrondi commercial).
 * Ex. 5/2 → 3 ; -5/2 → -3 ; 7/3 → 2.
 * Les deux arguments doivent être entiers ; le diviseur strictement positif.
 */
export function divideRounded(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new MoneyError(
      `divideRounded attend des entiers et un diviseur > 0 (${numerator}/${denominator})`,
    )
  }
  const sign = numerator < 0 ? -1 : 1
  const abs = Math.abs(numerator)
  const quotient = Math.floor(abs / denominator)
  const remainder = abs - quotient * denominator
  const rounded = remainder * 2 >= denominator ? quotient + 1 : quotient
  return sign * rounded
}

/** Applique un pourcentage (en bp) à un montant, avec arrondi commercial. Ex. TVA. */
export function applyRate(amount: Cents, rateBp: BasisPoints): Cents {
  assertCents(amount)
  assertCents(rateBp, 'taux')
  return divideRounded(amount * rateBp, FULL_PERCENT_BP)
}

/**
 * Répartit un montant selon des poids entiers positifs, SANS perte de centime
 * (méthode du plus grand reste / Hamilton).
 *
 * 1. chaque part reçoit la partie entière de `total × poids / somme des poids` ;
 * 2. les centimes restants sont distribués un par un aux parts ayant le plus grand reste ;
 * 3. en cas d'égalité de reste, la part qui apparaît en premier est servie d'abord
 *    (résultat déterministe).
 *
 * La somme du résultat est toujours exactement égale à `total`.
 * Un total négatif (avoir) est réparti en valeur absolue puis re-signé.
 */
export function allocateByWeights(total: Cents, weights: readonly number[]): Cents[] {
  assertCents(total, 'total')
  if (weights.length === 0) throw new MoneyError('Au moins un poids est requis')
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) {
      throw new MoneyError(`Les poids doivent être des entiers positifs (reçu : ${w})`)
    }
  }
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum === 0) throw new MoneyError('La somme des poids doit être > 0')

  const sign = total < 0 ? -1 : 1
  const absTotal = Math.abs(total)

  const shares = weights.map((w, index) => {
    const product = absTotal * w
    if (!Number.isSafeInteger(product)) throw new MoneyError('Montant trop grand pour être réparti')
    const base = Math.floor(product / weightSum)
    return { index, base, remainder: product - base * weightSum }
  })

  let leftover = absTotal - shares.reduce((acc, s) => acc + s.base, 0)
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const share of byRemainder) {
    if (leftover === 0) break
    share.base += 1
    leftover -= 1
  }

  return shares.map((s) => (s.base === 0 ? 0 : sign * s.base))
}

/**
 * Répartit un montant selon des pourcentages en points de base, dont la somme doit faire
 * exactement 10 000 (100 %). Ex. 300000 (3 000 €) en [6000, 4000] → [180000, 120000].
 */
export function allocateByPercentages(
  total: Cents,
  percentagesBp: readonly BasisPoints[],
): Cents[] {
  const sum = percentagesBp.reduce((a, b) => a + b, 0)
  if (sum !== FULL_PERCENT_BP) {
    throw new MoneyError(`La somme des pourcentages doit faire 100 % (reçu : ${sum / 100} %)`)
  }
  return allocateByWeights(total, percentagesBp)
}

/** Répartit un montant en `parts` parts égales. Ex. 10000 en 3 → [3334, 3333, 3333]. */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new MoneyError(`Nombre de parts invalide : ${parts}`)
  }
  return allocateByWeights(
    total,
    Array.from({ length: parts }, () => 1),
  )
}

/**
 * Convertit une saisie utilisateur en centimes SANS passer par un flottant.
 * Accepte « 1234,56 », « 1 234.5 », « -12 », « 1.234,56 », « 3000 € ».
 * Retourne `null` si la chaîne n'est pas un montant valide (plus de 2 décimales comprises).
 */
export function parseAmountToCents(input: string): Cents | null {
  const cleaned = input.replace(/[\s  €]/g, '').replace(/^\+/, '')
  if (cleaned === '') return null
  const match = /^(-)?(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/.exec(cleaned)
  if (!match) return null
  const [, minus, intPartRaw = '0', decimals = ''] = match
  // Le dernier séparateur (s'il est suivi de 1-2 chiffres) est le séparateur décimal,
  // les autres sont des séparateurs de milliers.
  const intPart = intPartRaw.replace(/[.,]/g, '')
  const cents = Number(intPart) * 100 + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return null
  return minus && cents !== 0 ? -cents : cents
}

export type CurrencyCode = 'EUR'

const formatters = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode, locale: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    formatters.set(key, formatter)
  }
  return formatter
}

/**
 * Formate des centimes pour l'affichage. Ex. 180000 → « 1 800,00 € » (locale fr-BE).
 * Attention : `Intl` insère des espaces insécables (U+00A0 / U+202F) entre les milliers
 * et avant le symbole.
 */
export function formatCents(
  amount: Cents,
  currency: CurrencyCode = 'EUR',
  locale = 'fr-BE',
): string {
  assertCents(amount)
  return getFormatter(currency, locale).format(amount / 100)
}

/** Formate des points de base en pourcentage lisible. Ex. 6000 → « 60 % », 3333 → « 33,33 % ». */
export function formatBasisPoints(value: BasisPoints, locale = 'fr-BE'): string {
  assertCents(value, 'pourcentage')
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / FULL_PERCENT_BP)
}

/** Part d'un montant dans un total, en points de base (arrondi commercial). 0 si total nul. */
export function ratioBp(part: Cents, total: Cents): BasisPoints {
  assertCents(part)
  assertCents(total)
  if (total === 0) return 0
  const sign = Math.sign(part) * Math.sign(total)
  return sign * divideRounded(Math.abs(part) * FULL_PERCENT_BP, Math.abs(total))
}
