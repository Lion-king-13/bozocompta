import { describe, expect, it } from 'vitest'
import {
  MoneyError,
  allocateByPercentages,
  allocateByWeights,
  applyRate,
  divideRounded,
  formatBasisPoints,
  formatCents,
  parseAmountToCents,
  ratioBp,
  splitEvenly,
  sumCents,
} from './money'

/** Intl utilise des espaces insécables : on les normalise pour comparer. */
const normalizeSpaces = (s: string) => s.replace(/[  ]/g, ' ')

describe('allocateByPercentages', () => {
  it('répartit 3 000 € en 60 % / 40 % → 1 800 € + 1 200 €', () => {
    const parts = allocateByPercentages(300_000, [6000, 4000])
    expect(parts).toEqual([180_000, 120_000])
    expect(sumCents(parts)).toBe(300_000)
  })

  it('répartit 100,00 € en trois tiers sans perdre de centime (plus grand reste)', () => {
    const parts = allocateByPercentages(10_000, [3334, 3333, 3333])
    expect(parts).toEqual([3334, 3333, 3333])
    expect(sumCents(parts)).toBe(10_000)
  })

  it('donne le centime restant au plus grand reste, pas forcément au premier', () => {
    // 0,10 € en 15 % / 15 % / 70 % : parts brutes 1,5 / 1,5 / 7 → restes 0,5 / 0,5 / 0
    // → les deux premières parts se disputent 1 centime : la première l'emporte (ordre stable).
    expect(allocateByPercentages(10, [1500, 1500, 7000])).toEqual([2, 1, 7])
    // 1,00 € en 33,33 / 33,33 / 33,34 : le plus grand reste est sur la 3e part.
    expect(allocateByPercentages(100, [3333, 3333, 3334])).toEqual([33, 33, 34])
  })

  it('répartit un avoir (montant négatif) de façon symétrique', () => {
    expect(allocateByPercentages(-10_000, [3334, 3333, 3333])).toEqual([-3334, -3333, -3333])
  })

  it('refuse des pourcentages dont la somme ne fait pas 100 %', () => {
    expect(() => allocateByPercentages(10_000, [5000, 4000])).toThrow(MoneyError)
  })

  it('refuse un montant non entier (euros flottants)', () => {
    expect(() => allocateByPercentages(30.5, [10_000])).toThrow(MoneyError)
  })

  it('conserve la somme exacte sur de nombreux cas', () => {
    const percentSets = [
      [2500, 2500, 2500, 2500],
      [1, 9999],
      [3333, 3333, 3334],
      [1000, 2000, 3000, 4000],
      [7, 13, 9980],
    ]
    for (let total = 1; total < 5000; total += 97) {
      for (const set of percentSets) {
        expect(sumCents(allocateByPercentages(total, set))).toBe(total)
      }
    }
  })
})

describe('splitEvenly / allocateByWeights', () => {
  it('découpe 100,00 € en trois : 33,34 + 33,33 + 33,33', () => {
    expect(splitEvenly(10_000, 3)).toEqual([3334, 3333, 3333])
  })

  it('accepte des poids quelconques', () => {
    expect(allocateByWeights(1000, [1, 1, 2])).toEqual([250, 250, 500])
  })

  it('refuse des poids invalides', () => {
    expect(() => allocateByWeights(100, [])).toThrow(MoneyError)
    expect(() => allocateByWeights(100, [0, 0])).toThrow(MoneyError)
    expect(() => allocateByWeights(100, [-1, 2])).toThrow(MoneyError)
  })
})

describe('arrondis et taux', () => {
  it('arrondit au plus proche, moitié loin de zéro', () => {
    expect(divideRounded(5, 2)).toBe(3)
    expect(divideRounded(-5, 2)).toBe(-3)
    expect(divideRounded(7, 3)).toBe(2)
    expect(divideRounded(8, 3)).toBe(3)
  })

  it('calcule la TVA en points de base', () => {
    expect(applyRate(300_000, 2100)).toBe(63_000) // 21 % de 3 000 €
    expect(applyRate(1999, 2000)).toBe(400) // 20 % de 19,99 € = 3,998 → 4,00 €
    expect(applyRate(1005, 600)).toBe(60) // 6 % de 10,05 € = 0,603 → 0,60 €
  })

  it('calcule un ratio en points de base', () => {
    expect(ratioBp(180_000, 300_000)).toBe(6000)
    expect(ratioBp(1, 3)).toBe(3333)
    expect(ratioBp(5, 0)).toBe(0)
  })
})

describe('formatage et saisie', () => {
  it('formate des centimes en euros (fr-BE)', () => {
    expect(normalizeSpaces(formatCents(180_000))).toBe('1 800,00 €')
    expect(normalizeSpaces(formatCents(-1234))).toBe('-12,34 €')
    expect(normalizeSpaces(formatCents(0))).toBe('0,00 €')
  })

  it('formate des points de base en pourcentage', () => {
    expect(normalizeSpaces(formatBasisPoints(6000))).toBe('60 %')
    expect(normalizeSpaces(formatBasisPoints(3333))).toBe('33,33 %')
  })

  it('parse une saisie sans passer par un flottant', () => {
    expect(parseAmountToCents('3000')).toBe(300_000)
    expect(parseAmountToCents('1 234,56')).toBe(123_456)
    expect(parseAmountToCents('1.234,56')).toBe(123_456)
    expect(parseAmountToCents('0,1')).toBe(10)
    expect(parseAmountToCents('19.99 €')).toBe(1999)
    expect(parseAmountToCents('-12,5')).toBe(-1250)
    expect(parseAmountToCents('0.07')).toBe(7)
  })

  it('rejette une saisie invalide', () => {
    expect(parseAmountToCents('')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
    expect(parseAmountToCents('1,234,5,6')).toBeNull()
    expect(parseAmountToCents('12,345')).toBe(1_234_500) // 3 chiffres = séparateur de milliers
  })
})
