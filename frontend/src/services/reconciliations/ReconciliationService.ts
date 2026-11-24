import type { Id, Reconciliation, ReconciliationQuery } from '@/domain'

/**
 * Rapprochements facture ↔ transaction : un simple lien, sans effet sur les totaux.
 * Au plus 1 ↔ 1 confirmé de chaque côté (sinon `CONFLICT`).
 */
export interface ReconciliationService {
  listReconciliations(query?: ReconciliationQuery): Promise<Reconciliation[]>
  /** Calcule de nouvelles suggestions (opération « IA » : erreurs IA simulables). */
  suggestReconciliations(): Promise<Reconciliation[]>
  confirmReconciliation(id: Id): Promise<Reconciliation>
  rejectReconciliation(id: Id): Promise<Reconciliation>
  /** Rapprochement manuel, directement confirmé. */
  createManualReconciliation(invoiceId: Id, transactionId: Id): Promise<Reconciliation>
}
