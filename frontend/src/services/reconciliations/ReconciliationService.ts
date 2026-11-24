import type { Id, Reconciliation, ReconciliationQuery } from '@/domain'

/**
 * Rapprochements facture ↔ transaction : un simple lien, sans effet sur les totaux.
 * Au plus 1 ↔ 1 confirmé de chaque côté (sinon `CONFLICT`).
 */
export interface ReconciliationService {
  /** `entityId` : transaction payée par OU imputée à cette entité (QA-05). */
  listReconciliations(query?: ReconciliationQuery): Promise<Reconciliation[]>
  /** Calcule de nouvelles suggestions (opération « IA » : erreurs IA simulables). */
  suggestReconciliations(): Promise<Reconciliation[]>
  /**
   * Confirmation humaine. Effet sur la facture (QA-11) : statut `paid`, `paidAt` = date de la
   * transaction ; elle sort de « à payer » et des échéances. Aucun effet sur les dépenses.
   * Une suggestion à écart non nul (`amountDifferenceCents`) est confirmable : l'écran doit
   * afficher l'écart avant confirmation (D6 révisé).
   */
  confirmReconciliation(id: Id): Promise<Reconciliation>
  /** Rejet humain, motif facultatif (QA-19). Aucun effet sur la facture. */
  rejectReconciliation(id: Id, reason?: string): Promise<Reconciliation>
  /** Rapprochement manuel, directement confirmé (même effet sur la facture que `confirm`). */
  createManualReconciliation(invoiceId: Id, transactionId: Id): Promise<Reconciliation>
}
