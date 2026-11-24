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

/**
 * Suggestions de rapprochement (arbitrage D6) — règle simple et explicable :
 * montant identique (+60 %), date proche ≤ 7 jours de l'émission ou de l'échéance (+20 %),
 * fournisseur reconnu dans la contrepartie ou numéro de facture dans le libellé (+20 %).
 * Seules les paires à montant identique sont proposées. 1 facture ↔ 1 transaction : on ignore
 * ce qui est déjà lié (suggéré ou confirmé) et les paires déjà rejetées ; puis on attribue
 * par score décroissant.
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
    if (inv.status === 'cancelled' || linkedInvoices.has(inv.id)) continue
    for (const tx of transactions) {
      if (tx.direction !== 'debit' || linkedTx.has(tx.id) || rejected.has(`${inv.id}|${tx.id}`))
        continue
      if (tx.amountCents !== inv.totalInclVatCents) continue
      const reasons = ['Montant identique']
      let scoreBp = 6000
      if (
        Math.min(
          daysApart(tx.bookingDate, inv.issueDate),
          daysApart(tx.bookingDate, inv.dueDate),
        ) <= 7
      ) {
        scoreBp += 2000
        reasons.push('Date proche')
      }
      const supplier = normalize(supplierNames.get(inv.supplierId) ?? '')
      if (
        (supplier && normalize(tx.counterpartyName) === supplier) ||
        normalize(tx.label).includes(normalize(inv.number))
      ) {
        scoreBp += 2000
        reasons.push('Fournisseur reconnu')
      }
      candidates.push({
        invoiceId: inv.id,
        transactionId: tx.id,
        scoreBp,
        reasons,
        amountDifferenceCents: 0,
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
