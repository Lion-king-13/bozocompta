import type {
  BasisPoints,
  Cents,
  CurrencyCode,
  Id,
  IsoDate,
  IsoDateTime,
  PageQuery,
} from './common'
import type { DataProvenance, ExtractedField } from './provenance'

/**
 * Cycle de vie PROVISOIRE d'une facture fournisseur :
 * to_review (importée / extraite, à vérifier) → approved (validée par un humain) → paid
 * + disputed (contestée) et cancelled (annulée, exclue de tous les totaux).
 * HORS PÉRIMÈTRE : workflow d'approbation multi-niveaux.
 */
export type InvoiceStatus = 'to_review' | 'approved' | 'paid' | 'disputed' | 'cancelled'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  to_review: 'À vérifier',
  approved: 'Validée',
  paid: 'Payée',
  disputed: 'Contestée',
  cancelled: 'Annulée',
}

export interface InvoiceLine {
  id: Id
  description: string
  /** Quantité entière. HYPOTHÈSE : pas de quantités décimales. */
  quantity: number
  unitPriceCents: Cents
  /** Taux de TVA en points de base (21 % = 2100). */
  vatRateBp: BasisPoints
  totalExclVatCents: Cents
  vatCents: Cents
  totalInclVatCents: Cents
  provenance: DataProvenance
}

/** Document PDF source de la facture (fictif en mode mock). */
export interface SourceDocument {
  fileName: string
  url: string
  sizeBytes: number
  uploadedAt: IsoDateTime
}

export interface Invoice {
  id: Id
  organizationId: Id
  /** Entité juridique destinataire, qui reçoit et paie la facture. */
  entityId: Id
  supplierId: Id
  /** Catégorie proposée (une par facture — HYPOTHÈSE de simplicité). */
  categoryId: Id | null
  number: string
  issueDate: IsoDate
  dueDate: IsoDate
  currency: CurrencyCode
  status: InvoiceStatus
  lines: InvoiceLine[]
  /** Totaux = somme exacte des lignes (vérifié par les tests du jeu de données). */
  totalExclVatCents: Cents
  vatCents: Cents
  /**
   * TTC, à titre informatif : une facture n'entre JAMAIS dans les totaux de dépenses
   * (arbitrage D1 : la dépense est la transaction ; la facture est un justificatif lié
   * par rapprochement). Non payée → « à payer ».
   */
  totalInclVatCents: Cents
  /** Provenance globale de la facture (extraite par l'IA, corrigée, validée…). */
  provenance: DataProvenance
  sourceDocument: SourceDocument | null
  createdAt: IsoDateTime
}

export interface InvoiceQuery extends PageQuery {
  entityId?: Id
  supplierId?: Id
  categoryId?: Id
  status?: InvoiceStatus
  /** Recherche plein texte (numéro, fournisseur). */
  search?: string
  issuedFrom?: IsoDate
  issuedTo?: IsoDate
  /** Tri (défaut : date d'émission décroissante). */
  sortBy?: InvoiceSortKey
  sortDirection?: 'asc' | 'desc'
}

export type InvoiceSortKey = 'issueDate' | 'dueDate' | 'number' | 'totalInclVatCents'

export type InvoiceLineInput = Pick<
  InvoiceLine,
  'description' | 'quantity' | 'unitPriceCents' | 'vatRateBp'
>

/** Correction / validation humaine d'une facture (les totaux sont recalculés, jamais saisis). */
export interface InvoiceInput {
  entityId: Id
  supplierId: Id
  categoryId: Id | null
  number: string
  issueDate: IsoDate
  dueDate: IsoDate
  lines: InvoiceLineInput[]
}

/**
 * Résultat de l'import d'un PDF : brouillon extrait par l'IA (SIMULÉE), à corriger puis
 * valider par un humain avant d'être enregistré comme facture.
 */
export interface InvoiceDraft {
  id: Id
  fileName: string
  supplierName: ExtractedField<string>
  /** Fournisseur connu correspondant, si trouvé. */
  supplierId: ExtractedField<Id>
  number: ExtractedField<string>
  issueDate: ExtractedField<IsoDate>
  dueDate: ExtractedField<IsoDate>
  totalExclVatCents: ExtractedField<Cents>
  vatCents: ExtractedField<Cents>
  totalInclVatCents: ExtractedField<Cents>
  categoryId: ExtractedField<Id>
  lines: { description: ExtractedField<string>; totalExclVatCents: ExtractedField<Cents> }[]
  /** Tokens consommés par l'extraction (comptés dans la consommation IA). */
  tokensUsed: number
  /** Toujours true côté front : extraction SIMULÉE, à annoncer comme telle dans l'interface. */
  simulated: boolean
}
