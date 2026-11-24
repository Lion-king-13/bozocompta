import { FULL_PERCENT_BP, allocateByPercentages } from '@/core/money'
import type { Allocation, AllocationInput } from '../analytics'
import type { BankTransaction } from '../bank'
import type { Cents, Id } from '../common'

/** Message d'erreur si la répartition est invalide, sinon `null`. */
export function validateAllocationInputs(inputs: readonly AllocationInput[]): string | null {
  if (inputs.length === 0) return 'Au moins une ligne de répartition est requise.'
  if (inputs.some((i) => !i.entityId)) return 'Chaque ligne doit viser une entité.'
  if (inputs.some((i) => !Number.isSafeInteger(i.percentBp) || i.percentBp <= 0)) {
    return 'Chaque pourcentage doit être un nombre strictement positif.'
  }
  const total = inputs.reduce((acc, i) => acc + i.percentBp, 0)
  if (total !== FULL_PERCENT_BP) {
    return `La répartition doit totaliser exactement 100 % (actuellement ${total / 100} %).`
  }
  return null
}

/**
 * Transforme une saisie (cible, pourcentage) en allocations chiffrées sur le montant de la
 * transaction, sans perte de centime (plus grand reste ; égalités → ordre des lignes).
 */
export function buildAllocations(
  transaction: Pick<BankTransaction, 'id' | 'amountCents'>,
  inputs: readonly AllocationInput[],
  makeId: (index: number) => Id,
): Allocation[] {
  const error = validateAllocationInputs(inputs)
  if (error) throw new Error(error)
  const amounts = allocateByPercentages(
    transaction.amountCents,
    inputs.map((i) => i.percentBp),
  )
  return inputs.map((input, index) => ({
    id: makeId(index),
    transactionId: transaction.id,
    entityId: input.entityId,
    costCenterId: input.costCenterId,
    percentBp: input.percentBp,
    amountCents: amounts[index] as Cents,
  }))
}

/**
 * Allocations effectives d'une transaction : ses allocations explicites, ou à défaut une
 * allocation implicite à 100 % sur l'entité payeuse.
 */
export function allocationsForTransaction(
  transaction: BankTransaction,
  allocations: readonly Allocation[],
): Allocation[] {
  const explicit = allocations.filter((a) => a.transactionId === transaction.id)
  if (explicit.length > 0) return explicit
  return [
    {
      id: `implicit-${transaction.id}`,
      transactionId: transaction.id,
      entityId: transaction.entityId,
      costCenterId: null,
      percentBp: FULL_PERCENT_BP,
      amountCents: transaction.amountCents,
    },
  ]
}
