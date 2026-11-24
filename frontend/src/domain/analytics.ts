import type { BasisPoints, Cents, Id } from './common'

/**
 * Centre de coûts — modèle UNIQUE pour les axes analytiques (arbitrage D3) :
 * un département OU un projet, rattaché à une entité.
 * Ex. « Lancement Paris » = centre de coûts de type `project` rattaché à Lumen France.
 */
export type CostCenterType = 'department' | 'project'

export const COST_CENTER_TYPE_LABELS: Record<CostCenterType, string> = {
  department: 'Département',
  project: 'Projet',
}

export interface CostCenter {
  id: Id
  entityId: Id
  type: CostCenterType
  code: string
  name: string
  active: boolean
}

/**
 * Allocation (imputation) analytique d'une TRANSACTION (arbitrages D2, D4, D5).
 *
 * - Cible = entité (obligatoire) + centre de coûts (facultatif).
 * - Base = montant payé de la transaction (TTC). Devise unique EUR, montants positifs.
 * - Liste plate de (cible, pourcentage) : la somme des `percentBp` vaut exactement 10 000,
 *   sinon refus ; les montants sont DÉRIVÉS (plus grand reste, égalités → ordre des lignes)
 *   et somment exactement au montant de la transaction.
 * - Une transaction sans allocation explicite est imputée implicitement à 100 % à son
 *   entité payeuse.
 * - Une allocation n'est qu'une ventilation : elle ne crée ni dépense supplémentaire ni
 *   écriture intersociétés (hors périmètre).
 */
export interface Allocation {
  id: Id
  transactionId: Id
  entityId: Id
  costCenterId: Id | null
  percentBp: BasisPoints
  amountCents: Cents
}

/** Saisie d'une ligne de répartition (le montant est calculé, jamais saisi). */
export type AllocationInput = Pick<Allocation, 'entityId' | 'costCenterId' | 'percentBp'>
