import type { Allocation, AllocationInput, Id } from '@/domain'

export interface AllocationQuery {
  transactionId?: Id
  /** Allocations imputées à cette entité. */
  entityId?: Id
}

/**
 * Allocations analytiques des transactions. `listAllocations` ne renvoie que les allocations
 * EXPLICITES ; une transaction sans allocation est imputée implicitement à 100 % à son entité
 * payeuse (géré par le calcul unique `computeImputedLines`).
 */
export interface AllocationService {
  listAllocations(query?: AllocationQuery): Promise<Allocation[]>
  /**
   * Remplace la ventilation d'une transaction. Pourcentages font foi (somme = 100 % exactement,
   * sinon `VALIDATION_ERROR`) ; montants dérivés côté service. Liste vide = retour à
   * l'imputation implicite.
   */
  replaceAllocations(transactionId: Id, inputs: AllocationInput[]): Promise<Allocation[]>
}
