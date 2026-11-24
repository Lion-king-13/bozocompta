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
  /**
   * Débits sans facture rapprochée et confirmée (justificatifs manquants).
   * `entityId` : payées par OU imputées à cette entité (QA-05).
   */
  listMissingReceipts(query?: { entityId?: Id }): Promise<BankTransactionView[]>
  listBankAccounts(): Promise<BankAccount[]>
  listImportBatches(): Promise<ImportBatch[]>
  /**
   * Import d'un relevé CSV (format : docs/partie-b/CONTRATS_API.md § Import CSV).
   * Fichier ou ligne invalide → `INVALID_FILE` avec le détail par ligne ; rien n'est importé.
   * Doublons (QA-07) : les lignes déjà présentes sur le compte (date, montant, sens, libellé)
   * sont ignorées et listées dans `skippedDuplicates` ; si TOUTES le sont → `CONFLICT`.
   */
  importCsv(bankAccountId: Id, file: UploadedFile): Promise<CsvImportResult>
  /**
   * Aperçu d'un CSV : mêmes contrôles que `importCsv` (fichier invalide → `INVALID_FILE`
   * avec le détail par ligne), mais RIEN n'est enregistré. Avec `bankAccountId`, chaque ligne
   * indique `duplicate: true` si elle existe déjà sur ce compte (QA-07).
   */
  previewCsv(file: UploadedFile, bankAccountId?: Id): Promise<CsvPreview>
}
