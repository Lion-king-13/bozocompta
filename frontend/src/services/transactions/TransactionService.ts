import type {
  BankAccount,
  BankTransactionQuery,
  BankTransactionView,
  CsvImportResult,
  CsvPreview,
  Id,
  ImportBatch,
  Page,
} from '@/domain'
import type { UploadedFile } from '../invoices/InvoiceService'

export interface TransactionService {
  listTransactions(query?: BankTransactionQuery): Promise<Page<BankTransactionView>>
  getTransaction(id: Id): Promise<BankTransactionView>
  /** Changement de catégorie par un utilisateur (provenance → `user_corrected`). */
  updateTransactionCategory(id: Id, categoryId: Id | null): Promise<BankTransactionView>
  /** Débits sans facture rapprochée et confirmée (justificatifs manquants). */
  listMissingReceipts(query?: { entityId?: Id }): Promise<BankTransactionView[]>
  listBankAccounts(): Promise<BankAccount[]>
  listImportBatches(): Promise<ImportBatch[]>
  /**
   * Import d'un relevé CSV (format : docs/partie-b/CONTRATS_API.md § Import CSV).
   * Fichier ou ligne invalide → `INVALID_FILE` avec le détail par ligne ; rien n'est importé.
   */
  importCsv(bankAccountId: Id, file: UploadedFile): Promise<CsvImportResult>
  /**
   * Aperçu d'un CSV : mêmes contrôles que `importCsv` (fichier invalide → `INVALID_FILE`
   * avec le détail par ligne), mais RIEN n'est enregistré.
   */
  previewCsv(file: UploadedFile): Promise<CsvPreview>
}
