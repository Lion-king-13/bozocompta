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

/**
 * Part imputée d'une transaction (allocation effective : explicite, ou implicite à 100 % sur
 * l'entité payeuse). Permet aux listes d'afficher « payé par » (`entityId` de la transaction)
 * ET « imputé à » sans recalcul.
 */
export interface TransactionImputation {
  entityId: Id
  costCenterId: Id | null
  percentBp: number
  amountCents: Cents
  /** true : aucune allocation explicite, 100 % à l'entité payeuse. */
  implicit: boolean
}

/** Transaction enrichie renvoyée par les listes. */
export interface BankTransactionView extends BankTransaction {
  /** Ventilation effective (somme = `amountCents` pour un débit). */
  imputations: TransactionImputation[]
  reconciliationStatus: TransactionReconciliationStatus
  /** Débit sans facture rapprochée et confirmée : justificatif manquant (dépense quand même comptée). */
  missingReceipt: boolean
}

export interface BankTransactionQuery extends PageQuery {
  /** Transactions PAYÉES par cette entité OU dont une part lui est IMPUTÉE (D7, QA-05). */
  entityId?: Id
  bankAccountId?: Id
  cardId?: Id
  direction?: TransactionDirection
  reconciliationStatus?: TransactionReconciliationStatus
  missingReceipt?: boolean
  /** Catégorie de la transaction. */
  categoryId?: Id
  /** Porteur de la carte utilisée (collaborateur). */
  holderUserId?: Id
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
  /** Transactions réellement créées (doublons exclus). */
  transactions: BankTransaction[]
  /** Lignes ignorées car déjà présentes sur le compte (QA-07). */
  skippedDuplicates: CsvPreviewRow[]
}

/** Ligne lue dans un CSV, avant import (aperçu). */
export interface CsvPreviewRow {
  /** Numéro de ligne dans le fichier (l'en-tête est la ligne 1). */
  line: number
  bookingDate: IsoDate
  label: string
  counterpartyName: string
  amountCents: Cents
  direction: TransactionDirection
  /** Code de catégorie lu dans le fichier (facultatif). */
  categoryCode: string | null
  /**
   * Doublon : une transaction identique (compte, date, montant, sens, libellé) existe déjà
   * (QA-07). Renseigné par l'aperçu quand un compte est fourni ; sinon false.
   */
  duplicate?: boolean
}

/** Aperçu d'un CSV valide : rien n'est encore enregistré. */
export interface CsvPreview {
  fileName: string
  rows: CsvPreviewRow[]
}
