import { describe, expect, it } from 'vitest'
import { sumCents } from '@/core/money'
import { SEED } from '@/mocks/dataset'
import { computeImputedLines, computeSpendReport } from './spend'
import { buildAllocations } from './allocations'

const YEAR = { start: '2026-01-01', end: '2026-12-31' }
const EXAMPLE_DAY = { start: '2026-09-15', end: '2026-09-15' }
const amount = (items: { key: string | null; amountCents: number }[], key: string | null) =>
  items.find((i) => i.key === key)?.amountCents ?? 0

describe('computeSpendReport — calcul unique des dépenses', () => {
  it("compte les 3 000 € de l'exemple UNE seule fois dans le total consolidé", () => {
    // Le 15/09 ne contient que le paiement de l'exemple.
    const org = computeSpendReport(SEED, { period: EXAMPLE_DAY })
    expect(org.imputedTotalCents).toBe(300_000)
    expect(org.paidTotalCents).toBe(300_000)
    expect(org.transactionCount).toBe(1)
  })

  it('distingue « imputé à » (1 800 / 1 200) et « payé par » (3 000 / 0)', () => {
    const be = computeSpendReport(SEED, { period: EXAMPLE_DAY, entityId: 'ent-be' })
    const fr = computeSpendReport(SEED, { period: EXAMPLE_DAY, entityId: 'ent-fr' })
    expect([be.imputedTotalCents, be.paidTotalCents]).toEqual([180_000, 300_000])
    expect([fr.imputedTotalCents, fr.paidTotalCents]).toEqual([120_000, 0])
    expect(amount(fr.byCostCenter, 'cc-fr-paris')).toBe(120_000)
    // L'allocation ne crée aucune dépense : 1 800 + 1 200 = 3 000.
    expect(be.imputedTotalCents + fr.imputedTotalCents).toBe(300_000)
  })

  it('attribue la dépense de l’exemple à Alice et à la carte belge', () => {
    const org = computeSpendReport(SEED, { period: EXAMPLE_DAY })
    expect(org.byUser).toEqual([{ key: 'usr-alice', amountCents: 300_000 }])
    expect(org.byCard).toEqual([{ key: 'card-be-alice', amountCents: 300_000 }])
    expect(org.byCategory).toEqual([{ key: 'cat-hardware', amountCents: 300_000 }])
  })

  it('vérifie l’invariant Σ imputé par entité = Σ payé par entité = total organisation', () => {
    const org = computeSpendReport(SEED, { period: YEAR })
    const debits = sumCents(
      SEED.transactions.filter((t) => t.direction === 'debit').map((t) => t.amountCents),
    )
    expect(org.imputedTotalCents).toBe(debits)
    expect(sumCents(org.imputedByEntity.map((i) => i.amountCents))).toBe(debits)
    expect(sumCents(org.paidByEntity.map((i) => i.amountCents))).toBe(debits)
    for (const breakdown of [
      org.byCostCenter,
      org.byCategory,
      org.byUser,
      org.byCard,
      org.byMonth,
    ]) {
      expect(sumCents(breakdown.map((i) => i.amountCents))).toBe(debits)
    }
    const perEntity = SEED.entities.map((e) =>
      computeSpendReport(SEED, { period: YEAR, entityId: e.id }),
    )
    expect(sumCents(perEntity.map((r) => r.imputedTotalCents))).toBe(debits)
    expect(sumCents(perEntity.map((r) => r.paidTotalCents))).toBe(debits)
  })

  it('ne compte ni les crédits ni les factures (la facture n’ajoute rien)', () => {
    const withExtraInvoice = {
      ...SEED,
      invoices: [...SEED.invoices, { ...SEED.invoices[0]!, id: 'inv-x' }],
    }
    expect(computeSpendReport(withExtraInvoice, { period: YEAR }).imputedTotalCents).toBe(
      computeSpendReport(SEED, { period: YEAR }).imputedTotalCents,
    )
    const credits = computeImputedLines(SEED, YEAR).filter((l) => l.transactionId === 'tx-be-001')
    expect(credits).toEqual([])
  })

  it('impute implicitement à 100 % à l’entité payeuse une transaction sans allocation', () => {
    const lines = computeImputedLines(SEED, YEAR).filter((l) => l.transactionId === 'tx-be-003')
    expect(lines).toEqual([
      expect.objectContaining({
        entityId: 'ent-be',
        payingEntityId: 'ent-be',
        amountCents: 30_245,
        implicit: true,
      }),
    ])
  })

  it('buildAllocations refuse une somme ≠ 100 % et dérive les montants sans perte', () => {
    const tx = { id: 't', amountCents: 10_000 }
    expect(() =>
      buildAllocations(
        tx,
        [{ entityId: 'ent-be', costCenterId: null, percentBp: 5000 }],
        () => 'a',
      ),
    ).toThrow()
    const parts = buildAllocations(
      tx,
      [3334, 3333, 3333].map((percentBp) => ({
        entityId: 'ent-be',
        costCenterId: null,
        percentBp,
      })),
      (i) => `a${i}`,
    )
    expect(parts.map((p) => p.amountCents)).toEqual([3334, 3333, 3333])
  })
})
