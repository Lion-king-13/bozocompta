import type {
  Id,
  Invoice,
  InvoiceDraft,
  InvoiceInput,
  InvoiceQuery,
  InvoiceSaveOptions,
  Page,
} from '@/domain'

/** Fichier choisi par l'utilisateur (un `File` du navigateur convient). */
export interface UploadedFile {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * Doublon de facture (QA-08) : même fournisseur + même numéro qu'une facture non annulée →
 * `CONFLICT` avec `details: [{ field: 'number', message }]` ; l'écran peut redemander avec
 * `{ allowDuplicate: true }` après confirmation explicite de l'utilisateur.
 */
export interface InvoiceService {
  /** `entityId` : reçue par cette entité OU paiement (en partie) imputé à elle (QA-05). */
  listInvoices(query?: InvoiceQuery): Promise<Page<Invoice>>
  getInvoice(id: Id): Promise<Invoice>
  /**
   * Création MANUELLE (QA-18), sans IA et sans consommer de quota : statut `approved`,
   * provenance `validated` (saisie humaine validée). Totaux recalculés. Permission `invoices:write`.
   */
  createInvoice(input: InvoiceInput, options?: InvoiceSaveOptions): Promise<Invoice>
  /**
   * Correction humaine des données (provenance → `user_corrected`). Totaux recalculés.
   * Refusée (`CONFLICT`) pour une facture payée, annulée ou rapprochée (QA-14).
   */
  updateInvoice(id: Id, input: InvoiceInput, options?: InvoiceSaveOptions): Promise<Invoice>
  /**
   * Rejet / contestation par un humain (QA-19) : statut `disputed`, motif facultatif.
   * Refusé (`CONFLICT`) pour une facture payée ou annulée.
   */
  rejectInvoice(id: Id, reason?: string): Promise<Invoice>
  /** Validation humaine : statut `approved`, données enregistrées (`recorded`). */
  validateInvoice(id: Id): Promise<Invoice>
  /**
   * Import d'un PDF textuel : contrôle RÉEL du fichier (type, taille, en-tête `%PDF`)
   * → `INVALID_FILE` ; puis extraction IA (SIMULÉE en mock) → `AI_UNAVAILABLE` /
   * `AI_QUOTA_EXCEEDED` possibles. Retourne un brouillon à corriger puis confirmer.
   */
  importInvoicePdf(file: UploadedFile): Promise<InvoiceDraft>
  /** Confirme un brouillon corrigé par l'utilisateur et l'enregistre comme facture. */
  confirmDraft(draftId: Id, input: InvoiceInput, options?: InvoiceSaveOptions): Promise<Invoice>
}
