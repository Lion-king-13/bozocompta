import type { BankTransactionView, Cents, Id } from '@/domain'

/**
 * Part d'une transaction imputée à une entité (QA-05), lue dans `imputations` (fournies par le
 * service) : somme des lignes de cette entité, tous centres de coûts confondus.
 * Une liste filtrée sur une entité affiche cette part à côté du « payé par », pour que sa
 * somme corresponde au tableau de bord de l'entité (qui lit « imputé à »).
 */
export function imputedPart(
  tx: Pick<BankTransactionView, 'imputations'>,
  entityId: Id,
): { amountCents: Cents; percentBp: number } {
  return tx.imputations
    .filter((i) => i.entityId === entityId)
    .reduce(
      (acc, i) => ({
        amountCents: acc.amountCents + i.amountCents,
        percentBp: acc.percentBp + i.percentBp,
      }),
      { amountCents: 0, percentBp: 0 },
    )
}
