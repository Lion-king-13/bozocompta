import type { Cents, DateRange, Id, IsoDate } from './common'

/**
 * Ligne imputée : une part (allocation explicite ou implicite à 100 %) d'une transaction
 * de débit. Brique de base de TOUS les calculs de dépenses.
 */
export interface ImputedLine {
  transactionId: Id
  bookingDate: IsoDate
  /** « Payé par » : entité de la carte / du compte. */
  payingEntityId: Id
  /** « Imputé à » : entité de la ventilation analytique. */
  entityId: Id
  costCenterId: Id | null
  categoryId: Id | null
  cardId: Id | null
  /** Porteur de la carte, si paiement par carte. */
  userId: Id | null
  amountCents: Cents
  /** true si aucune allocation explicite (100 % à l'entité payeuse). */
  implicit: boolean
}

/** Ligne d'une ventilation : `key` = id de l'axe ou `YYYY-MM` ; `null` = non affecté. */
export interface SpendBreakdownItem {
  key: Id | null
  amountCents: Cents
}

/**
 * Rapport de dépenses produit par `computeSpendReport` — source de vérité UNIQUE pour
 * tous les écrans. Voir src/domain/finance/spend.ts pour les règles.
 */
export interface SpendReport {
  period: DateRange
  /** Filtre « imputé à » appliqué (null = organisation). */
  entityId: Id | null
  /** Dépenses imputées au périmètre (lecture par défaut des dashboards). */
  imputedTotalCents: Cents
  /** Dépenses payées par le périmètre (information secondaire). */
  paidTotalCents: Cents
  transactionCount: number
  /** Ventilation « imputé à » par entité. */
  imputedByEntity: SpendBreakdownItem[]
  /** Ventilation « payé par » par entité. */
  paidByEntity: SpendBreakdownItem[]
  byCostCenter: SpendBreakdownItem[]
  byCategory: SpendBreakdownItem[]
  byUser: SpendBreakdownItem[]
  byCard: SpendBreakdownItem[]
  byMonth: SpendBreakdownItem[]
}
