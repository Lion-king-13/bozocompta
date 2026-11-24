/**
 * Correspondances domaine → vocabulaire d'interface, partagées par les écrans financiers
 * (factures, transactions, rapprochements, allocations, cartes…).
 * Les composants `@/components/ui` ne connaissent pas le domaine : la traduction se fait ici.
 */
import type { AiProvenance, BusinessStatus, Tone } from '@/components/ui'
import type {
  BankTransactionView,
  CardStatus,
  DataProvenance,
  InvoiceStatus,
  ReconciliationStatus,
} from '@/domain'

export const PROVENANCE_TO_UI: Record<DataProvenance, AiProvenance> = {
  ai_extracted: 'extracted',
  ai_suggested: 'suggested',
  user_corrected: 'corrected',
  validated: 'validated',
  recorded: 'recorded',
}

export const INVOICE_STATUS_TO_UI: Record<InvoiceStatus, BusinessStatus> = {
  to_review: 'to_validate',
  approved: 'validated',
  paid: 'paid',
  disputed: 'disputed',
  cancelled: 'cancelled',
}

export const RECONCILIATION_STATUS_TO_UI: Record<ReconciliationStatus, BusinessStatus> = {
  suggested: 'pending',
  confirmed: 'reconciled',
  rejected: 'rejected',
}

export const CARD_STATUS_TO_UI: Record<CardStatus, { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  blocked: { tone: 'danger', label: 'Désactivée' },
  expired: { tone: 'neutral', label: 'Expirée' },
}

/** Statut de rapprochement d'une transaction, en clair. */
export function transactionMatchStatus(tx: BankTransactionView): { tone: Tone; label: string } {
  if (tx.reconciliationStatus === 'matched') return { tone: 'success', label: 'Rapprochée' }
  if (tx.reconciliationStatus === 'suggested') return { tone: 'info', label: 'Suggestion IA' }
  return { tone: 'neutral', label: 'Non rapprochée' }
}

/** Libellé masqué d'une carte : jamais plus que les 4 derniers chiffres. */
export function maskedCard(last4: string): string {
  return `•••• ${last4}`
}
