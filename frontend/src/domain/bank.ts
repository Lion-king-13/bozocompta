import type { Cents, CurrencyCode, Id, IsoDate, IsoDateTime, PageQuery } from './common'
import type { DataProvenance } from './provenance'

export interface BankAccount {
  id: Id
  entityId: Id
  name: string
  bankName: string
  /** IBAN masqué et fictif : aucune donnée bancaire réelle côté front. */
  ibanMasked: string
  currency: CurrencyCode
}

/** Statut de rapprochement d'une transaction, DÉRIVÉ des rapprochements (jamais stocké). */
export type TransactionReconciliationStatus = 'unmatched' | 'suggested' | 'matched'

/** `debit` = sortie d'argent (dépense), `credit` = entrée. */
export type TransactionDirection = 'debit' | 'credit'

/**
 * Transaction bancaire = UNITÉ DE DÉPENSE (arbitrage D1) : les totaux de dépenses se
 * calculent sur les transactions de débit. Montant toujours POSITIF + sens (D4).
 */
export interface BankTransaction {
  id: Id
  /** Entité payeuse = entité du compte / de la carte (« payé par »). */
  entityId: Id
  bankAccountId: Id
  bookingDate: IsoDate
  /** Libellé tel que fourni par la banque. */
  label: string
  counterpartyName: string
  amountCents: Cents
  direction: TransactionDirection
  currency: CurrencyCode
  source: 'csv_import' | 'card'
  /** Carte utilisée (paiement par carte), sinon null. */
  cardId: Id | null
  categoryId: Id | null
  /** Provenance de la catégorie (suggestion IA, corrigée, validée…). */
  categoryProvenance: DataProvenance | null
  importBatchId: Id | null
}

/** Transaction enrichie renvoyée par les listes. */
export interface BankTransactionView extends BankTransaction {
  reconciliationStatus: TransactionReconciliationStatus
  /** Débit sans facture rapprochée et confirmée : justificatif manquant (dépense quand même comptée). */
  missingReceipt: boolean
}

export interface BankTransactionQuery extends PageQuery {
  entityId?: Id
  bankAccountId?: Id
  cardId?: Id
  direction?: TransactionDirection
  reconciliationStatus?: TransactionReconciliationStatus
  missingReceipt?: boolean
  search?: string
  bookedFrom?: IsoDate
  bookedTo?: IsoDate
}

/** Un import de relevé CSV. */
export interface ImportBatch {
  id: Id
  entityId: Id
  bankAccountId: Id
  fileName: string
  importedAt: IsoDateTime
  importedByUserId: Id
  rowCount: number
}

export interface CsvImportResult {
  batch: ImportBatch
  transactions: BankTransaction[]
}
