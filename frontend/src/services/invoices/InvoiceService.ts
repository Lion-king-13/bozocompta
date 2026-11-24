import type { Id, Invoice, InvoiceDraft, InvoiceInput, InvoiceQuery, Page } from '@/domain'

/** Fichier choisi par l'utilisateur (un `File` du navigateur convient). */
export interface UploadedFile {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface InvoiceService {
  listInvoices(query?: InvoiceQuery): Promise<Page<Invoice>>
  getInvoice(id: Id): Promise<Invoice>
  /** Correction humaine des données (provenance → `user_corrected`). Totaux recalculés. */
  updateInvoice(id: Id, input: InvoiceInput): Promise<Invoice>
  /** Validation humaine : statut `approved`, données enregistrées (`recorded`). */
  validateInvoice(id: Id): Promise<Invoice>
  /**
   * Import d'un PDF textuel : contrôle RÉEL du fichier (type, taille, en-tête `%PDF`)
   * → `INVALID_FILE` ; puis extraction IA (SIMULÉE en mock) → `AI_UNAVAILABLE` /
   * `AI_QUOTA_EXCEEDED` possibles. Retourne un brouillon à corriger puis confirmer.
   */
  importInvoicePdf(file: UploadedFile): Promise<InvoiceDraft>
  /** Confirme un brouillon corrigé par l'utilisateur et l'enregistre comme facture. */
  confirmDraft(draftId: Id, input: InvoiceInput): Promise<Invoice>
}
