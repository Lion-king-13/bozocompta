import type { BasisPoints } from '@/domain'

/**
 * Lit un pourcentage saisi par l'utilisateur (« 60 », « 33,33 », « 12.5 ») et le convertit
 * en points de base (1 % = 100) SANS flottant. Retourne `null` si la saisie est invalide
 * (texte, plus de 2 décimales, valeur supérieure à 100 %).
 */
export function parsePercentToBp(input: string): BasisPoints | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(input.trim().replace(/\s*%$/, ''))
  if (!match) return null
  const [, whole = '0', decimals = ''] = match
  const bp = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
  return bp <= 10_000 ? bp : null
}

/** Affiche des points de base dans un champ de saisie : 6000 → « 60 », 3333 → « 33,33 ». */
export function bpToInput(bp: BasisPoints): string {
  const whole = Math.floor(bp / 100)
  const decimals = bp % 100
  if (decimals === 0) return String(whole)
  const text = String(decimals).padStart(2, '0')
  return `${whole},${text.endsWith('0') ? text.slice(0, 1) : text}`
}

/** Affiche des centimes dans un champ de saisie : 247934 → « 2479,34 ». */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}
