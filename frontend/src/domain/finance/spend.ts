import { sumCents } from '@/core/money'
import type { Allocation } from '../analytics'
import type { BankTransaction } from '../bank'
import type { Card } from '../card'
import type { Cents, DateRange, Id } from '../common'
import type { ImputedLine, SpendBreakdownItem, SpendReport } from '../spend'
import { allocationsForTransaction } from './allocations'

/**
 * CALCUL UNIQUE DES DÉPENSES — réutilisé par TOUS les écrans (dashboards organisation et
 * entité, budgets, allocations, écrans financiers). Ne pas recalculer de dépenses ailleurs :
 * c'est ce qui garantit la cohérence entre écrans.
 *
 * Règles (arbitrages D1, D2, D4 — voir docs/partie-b/DECISIONS.md) :
 * 1. Unité de dépense = la TRANSACTION de débit. Une facture n'ajoute jamais rien : le
 *    rapprochement n'est qu'un lien. Confirmer / rejeter une suggestion ne change aucun total.
 *    Une transaction sans facture est comptée (et signalée « justificatif manquant »).
 * 2. Deux lectures, jamais mélangées :
 *    - « payé par » = entité de la carte / du compte (`transaction.entityId`) ;
 *    - « imputé à » = ventilation analytique (allocations ; à défaut 100 % entité payeuse).
 * 3. Invariant : Σ imputé par entité = Σ payé par entité = total organisation.
 */
export interface SpendInput {
  transactions: readonly BankTransaction[]
  allocations: readonly Allocation[]
  cards: readonly Card[]
}

/** Lignes imputées des transactions de DÉBIT de la période (bornes incluses). */
export function computeImputedLines(input: SpendInput, period: DateRange): ImputedLine[] {
  const holderByCard = new Map(input.cards.map((c) => [c.id, c.holderUserId]))
  const lines: ImputedLine[] = []
  for (const tx of input.transactions) {
    if (tx.direction !== 'debit') continue
    if (tx.bookingDate < period.start || tx.bookingDate > period.end) continue
    const allocations = allocationsForTransaction(tx, input.allocations)
    for (const a of allocations) {
      lines.push({
        transactionId: tx.id,
        bookingDate: tx.bookingDate,
        payingEntityId: tx.entityId,
        entityId: a.entityId,
        costCenterId: a.costCenterId,
        categoryId: tx.categoryId,
        cardId: tx.cardId,
        userId: tx.cardId ? (holderByCard.get(tx.cardId) ?? null) : null,
        amountCents: a.amountCents,
        implicit: a.id.startsWith('implicit-'),
      })
    }
  }
  return lines
}

function breakdown(
  lines: readonly ImputedLine[],
  key: (l: ImputedLine) => Id | null,
): SpendBreakdownItem[] {
  const totals = new Map<Id | null, Cents>()
  for (const l of lines) totals.set(key(l), (totals.get(key(l)) ?? 0) + l.amountCents)
  return [...totals.entries()]
    .map(([k, amountCents]) => ({ key: k, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents || String(a.key).localeCompare(String(b.key)))
}

export interface SpendOptions {
  period: DateRange
  /** Périmètre « imputé à » ; `null` ou absent = organisation (consolidé). */
  entityId?: Id | null
}

/**
 * Rapport de dépenses d'un périmètre.
 * - Organisation : imputedTotal = paidTotal = total des débits ; chaque ventilation y somme.
 * - Entité X : lecture par défaut = lignes IMPUTÉES à X (toutes ses ventilations somment à
 *   `imputedTotalCents`) ; `paidTotalCents` = débits payés par X (information secondaire).
 *   Exemple obligatoire : Belgique imputé 1 800 € / payé 3 000 € ; France imputé 1 200 € / payé 0 €.
 */
export function computeSpendReport(input: SpendInput, options: SpendOptions): SpendReport {
  const entityId = options.entityId ?? null
  const all = computeImputedLines(input, options.period)
  const imputed = entityId ? all.filter((l) => l.entityId === entityId) : all
  const paid = entityId ? all.filter((l) => l.payingEntityId === entityId) : all
  return {
    period: options.period,
    entityId,
    imputedTotalCents: sumCents(imputed.map((l) => l.amountCents)),
    paidTotalCents: sumCents(paid.map((l) => l.amountCents)),
    transactionCount: new Set(imputed.map((l) => l.transactionId)).size,
    imputedByEntity: breakdown(imputed, (l) => l.entityId),
    paidByEntity: breakdown(paid, (l) => l.payingEntityId),
    byCostCenter: breakdown(imputed, (l) => l.costCenterId),
    byCategory: breakdown(imputed, (l) => l.categoryId),
    byUser: breakdown(imputed, (l) => l.userId),
    byCard: breakdown(imputed, (l) => l.cardId),
    byMonth: breakdown(imputed, (l) => l.bookingDate.slice(0, 7)).sort((a, b) =>
      String(a.key).localeCompare(String(b.key)),
    ),
  }
}
