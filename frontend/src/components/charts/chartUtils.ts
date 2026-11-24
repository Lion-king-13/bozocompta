/**
 * Petites fonctions PURES partagées par les graphiques SVG maison.
 * Aucune librairie : on calcule soi-même l'échelle et les graduations.
 */

/** Une valeur affichée par un graphique (montant en centimes, nombre de tokens…). */
export interface ChartDatum {
  key: string
  /** Libellé affiché (court pour l'axe des abscisses). */
  label: string
  /** Libellé complet (infobulle, tableau). Défaut : `label`. */
  fullLabel?: string
  value: number
  /** Emplacement de la palette catégorielle (1 à 8), au-delà : « Autres ». Défaut : 1. */
  colorSlot?: number
  /** Barre hachurée (second indice visuel, ex. « payé par »). */
  hatched?: boolean
  /** Précision affichée sous le libellé (ex. « imputé à »). */
  sublabel?: string
}

/**
 * Couleur d'une série : palette catégorielle du design system, dans l'ordre fixe.
 * Au-delà de 8 séries : couleur « Autres » (jamais de teinte inventée).
 */
export function seriesColor(slot = 1): string {
  return slot >= 1 && slot <= 8 ? `var(--chart-cat-${slot})` : 'var(--chart-other)'
}

/** Maximum « rond » de l'axe (1, 2, 2,5, 5 ou 10 × une puissance de 10). */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(max))
  const f = max / power
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * power
}

/** Graduations entières de 0 à `max` (inclus), `count` intervalles. */
export function axisTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => Math.round((max * i) / count))
}

/**
 * Une étiquette d'abscisse sur combien, pour garder au moins `minPx` pixels entre deux
 * étiquettes (évite les chevauchements sur mobile).
 */
export function labelStep(count: number, widthPx: number, minPx = 48): number {
  if (count <= 0 || widthPx <= 0) return 1
  return Math.max(1, Math.ceil((count * minPx) / widthPx))
}

/** Pourcentage (0 à 100) d'une valeur par rapport au maximum, borné. */
export function percentOf(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}
