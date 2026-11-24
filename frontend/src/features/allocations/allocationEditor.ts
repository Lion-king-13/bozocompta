/**
 * Logique (sans Vue) de l'éditeur de répartition analytique d'UNE transaction.
 *
 * - L'utilisateur saisit des POURCENTAGES (ils font foi) ; les montants sont DÉRIVÉS par
 *   `allocateByPercentages` (plus grand reste) : aucun centime n'est perdu ni créé.
 * - Une répartition n'est enregistrable que si la somme vaut exactement 100 %, que chaque
 *   ligne vise une entité et qu'aucune cible (entité + centre de coûts) n'apparaît deux fois.
 * - La ventilation ne change pas le montant payé : une seule dépense, plusieurs imputations.
 */
import { FULL_PERCENT_BP, allocateByPercentages, splitEvenly } from '@/core/money'
import { validateAllocationInputs } from '@/domain/finance'
import type { Allocation, AllocationInput, BasisPoints, Cents } from '@/domain'
import { bpToInput, parsePercentToBp } from '@/features/transactions/shared/percent'

export interface AllocationLineForm {
  entityId: string
  /** '' = pas de centre de coûts. */
  costCenterId: string
  /** Pourcentage saisi, ex. « 60 » ou « 33,33 ». */
  percent: string
}

export interface AllocationPreview {
  /** Pourcentage lu et montant dérivé de chaque ligne (null si illisible). */
  lines: { percentBp: BasisPoints | null; amountCents: Cents | null }[]
  /** Erreur propre à une ligne (index → message). */
  lineErrors: Record<number, string>
  totalBp: BasisPoints
  /** 100 % − total (négatif si la somme dépasse 100 %). */
  remainingBp: BasisPoints
  /** Montant restant à imputer (null si la somme dépasse 100 % ou si une ligne est illisible). */
  remainingCents: Cents | null
  /** Somme des montants dérivés. */
  allocatedCents: Cents | null
  /** Raison pour laquelle on ne peut pas enregistrer (null si tout est correct). */
  blockingReason: string | null
}

/** Lignes de départ à partir des allocations existantes (explicites ou implicite à 100 %). */
export function linesFromAllocations(allocations: readonly Allocation[]): AllocationLineForm[] {
  return allocations.map((a) => ({
    entityId: a.entityId,
    costCenterId: a.costCenterId ?? '',
    percent: bpToInput(a.percentBp),
  }))
}

export function toAllocationInputs(lines: readonly AllocationLineForm[]): AllocationInput[] {
  return lines.map((l) => ({
    entityId: l.entityId,
    costCenterId: l.costCenterId || null,
    percentBp: parsePercentToBp(l.percent) ?? 0,
  }))
}

export function previewAllocation(
  amountCents: Cents,
  lines: readonly AllocationLineForm[],
): AllocationPreview {
  const lineErrors: Record<number, string> = {}
  const seen = new Set<string>()
  const bps = lines.map((line, index) => {
    const bp = parsePercentToBp(line.percent)
    const target = `${line.entityId}|${line.costCenterId}`
    if (!line.entityId) lineErrors[index] = 'Choisissez une entité.'
    else if (seen.has(target)) lineErrors[index] = 'Cette imputation figure déjà dans la liste.'
    else if (bp === null || bp <= 0) lineErrors[index] = 'Pourcentage invalide (ex. 60 ou 33,33).'
    seen.add(target)
    return bp !== null && bp > 0 ? bp : null
  })

  const totalBp = bps.reduce<number>((sum, bp) => sum + (bp ?? 0), 0)
  const remainingBp = FULL_PERCENT_BP - totalBp
  const readable = bps.every((bp) => bp !== null) && lines.length > 0

  // Montants dérivés : si la somme est < 100 %, le reste devient une part « à imputer »
  // pour que tous les montants restent exacts au centime.
  let amounts: (Cents | null)[] = bps.map(() => null)
  let remainingCents: Cents | null = null
  if (readable && remainingBp >= 0) {
    const weights = remainingBp > 0 ? [...(bps as number[]), remainingBp] : (bps as number[])
    const derived = allocateByPercentages(amountCents, weights)
    amounts = derived.slice(0, bps.length)
    remainingCents = remainingBp > 0 ? (derived[bps.length] as Cents) : 0
  }
  const allocatedCents = amounts.every((a) => a !== null)
    ? amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    : null

  let blockingReason: string | null = null
  if (lines.length === 0) blockingReason = 'Ajoutez au moins une imputation.'
  else if (Object.keys(lineErrors).length > 0) blockingReason = 'Corrigez les lignes signalées.'
  else if (totalBp !== FULL_PERCENT_BP)
    blockingReason =
      remainingBp > 0
        ? 'Le total doit faire exactement 100 % : il reste une part à imputer.'
        : 'Le total dépasse 100 % : réduisez une des parts.'
  else blockingReason = validateAllocationInputs(toAllocationInputs(lines))

  return {
    lines: bps.map((percentBp, i) => ({ percentBp, amountCents: amounts[i] ?? null })),
    lineErrors,
    totalBp,
    remainingBp,
    remainingCents,
    allocatedCents,
    blockingReason,
  }
}

/** Répartit 100 % à parts égales entre les lignes, sans perte : 3 lignes → 33,34 / 33,33 / 33,33. */
export function splitLinesEvenly(lines: readonly AllocationLineForm[]): AllocationLineForm[] {
  if (lines.length === 0) return []
  const parts = splitEvenly(FULL_PERCENT_BP, lines.length)
  return lines.map((line, i) => ({ ...line, percent: bpToInput(parts[i] as number) }))
}
