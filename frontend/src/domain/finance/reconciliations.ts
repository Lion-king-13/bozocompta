import { formatCents } from '@/core/money'
import type { BankTransaction, TransactionReconciliationStatus } from '../bank'
import type { Invoice } from '../invoice'
import type { Id } from '../common'
import type { Reconciliation } from '../reconciliation'

/** Statut d'une transaction dérivé de ses rapprochements : validé > suggéré > aucun. */
export function transactionReconciliationStatus(
  transactionId: Id,
  reconciliations: readonly Reconciliation[],
): TransactionReconciliationStatus {
  const related = reconciliations.filter((r) => r.transactionId === transactionId)
  if (related.some((r) => r.status === 'confirmed')) return 'matched'
  if (related.some((r) => r.status === 'suggested')) return 'suggested'
  return 'unmatched'
}

export interface MatchCandidate {
  invoiceId: Id
  transactionId: Id
  scoreBp: number
  reasons: string[]
  amountDifferenceCents: number
}

const DAY_MS = 86_400_000
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS
const normalize = (s: string) =>
  s
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')

/** Écart toléré pour une suggestion à montant différent : 1 % du TTC de la facture (D6, QA-25). */
export const SMALL_GAP_RATIO_PERCENT = 1

/**
 * Suggestions de rapprochement (arbitrage D6 révisé, QA-25) — règle simple et explicable :
 * - montant identique : +60 % ;
 * - OU écart faible (≤ 1 % du TTC) avec fournisseur reconnu : +40 %, l'écart est signalé
 *   EXPLICITEMENT (raison « Écart de montant de … » et `amountDifferenceCents` ≠ 0) ;
 * - date proche ≤ 7 jours de l'émission ou de l'échéance : +20 % ;
 * - fournisseur reconnu (contrepartie) ou numéro de facture dans le libellé : +20 %.
 * 1 facture ↔ 1 transaction : on ignore ce qui est déjà lié (suggéré ou confirmé) et les paires
 * déjà rejetées ; puis on attribue par score décroissant.
 */
export function suggestMatches(
  invoices: readonly Invoice[],
  transactions: readonly BankTransaction[],
  reconciliations: readonly Reconciliation[],
  supplierNames: ReadonlyMap<Id, string>,
): MatchCandidate[] {
  const active = reconciliations.filter((r) => r.status !== 'rejected')
  const linkedInvoices = new Set(active.map((r) => r.invoiceId))
  const linkedTx = new Set(active.map((r) => r.transactionId))
  const rejected = new Set(
    reconciliations
      .filter((r) => r.status === 'rejected')
      .map((r) => `${r.invoiceId}|${r.transactionId}`),
  )

  const candidates: MatchCandidate[] = []
  for (const inv of invoices) {
    if (inv.status === 'cancelled' || inv.status === 'paid' || linkedInvoices.has(inv.id)) continue
    for (const tx of transactions) {
      if (tx.direction !== 'debit' || linkedTx.has(tx.id) || rejected.has(`${inv.id}|${tx.id}`))
        continue
      const diff = tx.amountCents - inv.totalInclVatCents
      const supplier = normalize(supplierNames.get(inv.supplierId) ?? '')
      const supplierMatch =
        (!!supplier && normalize(tx.counterpartyName) === supplier) ||
        normalize(tx.label).includes(normalize(inv.number))
      const smallGap =
        diff !== 0 &&
        supplierMatch &&
        Math.abs(diff) * 100 <= inv.totalInclVatCents * SMALL_GAP_RATIO_PERCENT
      if (diff !== 0 && !smallGap) continue
      const reasons = diff === 0 ? ['Montant identique'] : []
      let scoreBp = diff === 0 ? 6000 : 4000
      if (
        Math.min(
          daysApart(tx.bookingDate, inv.issueDate),
          daysApart(tx.bookingDate, inv.dueDate),
        ) <= 7
      ) {
        scoreBp += 2000
        reasons.push('Date proche')
      }
      if (supplierMatch) {
        scoreBp += 2000
        reasons.push('Fournisseur reconnu')
      }
      if (diff !== 0) reasons.push(`Écart de montant de ${formatCents(Math.abs(diff))}`)
      candidates.push({
        invoiceId: inv.id,
        transactionId: tx.id,
        scoreBp,
        reasons,
        amountDifferenceCents: diff,
      })
    }
  }
  candidates.sort(
    (a, b) =>
      b.scoreBp - a.scoreBp ||
      a.invoiceId.localeCompare(b.invoiceId) ||
      a.transactionId.localeCompare(b.transactionId),
  )
  const usedInv = new Set<Id>()
  const usedTx = new Set<Id>()
  return candidates.filter((c) => {
    if (usedInv.has(c.invoiceId) || usedTx.has(c.transactionId)) return false
    usedInv.add(c.invoiceId)
    usedTx.add(c.transactionId)
    return true
  })
}
