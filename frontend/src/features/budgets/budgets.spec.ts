import { beforeEach, describe, expect, it } from 'vitest'
import { sumCents } from '@/core/money'
import type { Budget, ImputedLine } from '@/domain'
import { computeBudgetStatus } from '@/domain/finance'
import type { Services } from '@/services'
import { createTestServices, loginAs } from '@/test/helpers'
import { budgetLevel, remainingText } from './budgetLevel'
import { monthOptions } from './months'

const BUDGET: Budget = {
  id: 'b-test',
  entityId: 'ent-be',
  categoryId: null,
  costCenterId: null,
  label: 'Test',
  month: '2026-11',
  amountCents: 100_000,
}
const line = (amountCents: number): ImputedLine => ({
  transactionId: 'tx',
  bookingDate: '2026-11-10',
  payingEntityId: 'ent-be',
  entityId: 'ent-be',
  costCenterId: null,
  categoryId: null,
  cardId: null,
  userId: null,
  amountCents,
  implicit: true,
})
const statusAt = (consumed: number) => computeBudgetStatus(BUDGET, [line(consumed)])

describe('statut de budget aux seuils 80 % et 100 %', () => {
  it('79 % : dans le budget', () => {
    const s = statusAt(79_000)
    expect([s.consumedBp, s.overBudget, budgetLevel(s)]).toEqual([7_900, false, 'ok'])
  })
  it('80 % : seuil d’alerte atteint', () => {
    const s = statusAt(80_000)
    expect([s.consumedBp, s.overBudget, budgetLevel(s)]).toEqual([8_000, false, 'near'])
  })
  it('100 % : entièrement consommé, pas encore dépassé', () => {
    const s = statusAt(100_000)
    expect([s.consumedBp, s.overBudget, budgetLevel(s)]).toEqual([10_000, false, 'reached'])
    expect(remainingText(s)).toContain('Il reste 0,00')
  })
  it('101 % : dépassé', () => {
    const s = statusAt(101_000)
    expect([s.consumedBp, s.overBudget, budgetLevel(s)]).toEqual([10_100, true, 'exceeded'])
    expect(s.remainingCents).toBe(-1_000)
    expect(remainingText(s)).toMatch(/^Dépassé de 10,00/)
  })
})

describe('service budgets (mock)', () => {
  let services: Services
  beforeEach(async () => {
    services = createTestServices()
    await loginAs(services, 'alice')
  })

  it('le budget « Informatique Belgique » de démo est dépassé', async () => {
    const list = await services.budgets.listBudgetStatuses()
    const it = list.find((s) => s.budget.id === 'bud-be-it-2026-11')!
    expect(it.overBudget).toBe(true)
    expect(budgetLevel(it)).toBe('exceeded')
  })

  it('le détail liste les lignes imputées qui somment au consommé', async () => {
    for (const s of await services.budgets.listBudgetStatuses()) {
      const detail = await services.budgets.getBudgetDetail(s.budget.id)
      expect(detail.status).toEqual(s)
      expect(sumCents(detail.lines.map((l) => l.amountCents))).toBe(s.consumedCents)
      expect(detail.lines.every((l) => l.entityId === s.budget.entityId)).toBe(true)
    }
    // Projet France : inclut la part de 30 % du paiement belge tx-be-103 (imputé, pas payé).
    const paris = await services.budgets.getBudgetDetail('bud-fr-paris-2026-11')
    expect(paris.lines.map((l) => l.transactionId)).toContain('tx-be-103')
  })

  it('crée, modifie et supprime un budget', async () => {
    const created = await services.budgets.createBudget({
      ...BUDGET,
      label: '  Déplacements Belgique ',
      categoryId: 'cat-travel',
    })
    expect(created.label).toBe('Déplacements Belgique')
    let list = await services.budgets.listBudgetStatuses({ entityId: 'ent-be' })
    const status = list.find((s) => s.budget.id === created.id)!
    expect(status.consumedCents).toBe(4_590) // restaurant Le Midi, novembre

    await services.budgets.updateBudget(created.id, { ...created, amountCents: 4_000 })
    list = await services.budgets.listBudgetStatuses({ entityId: 'ent-be' })
    expect(list.find((s) => s.budget.id === created.id)!.overBudget).toBe(true)

    await services.budgets.deleteBudget(created.id)
    list = await services.budgets.listBudgetStatuses({ entityId: 'ent-be' })
    expect(list.some((s) => s.budget.id === created.id)).toBe(false)
  })

  it('refuse un montant nul, un mois invalide ou un centre de coûts d’une autre entité', async () => {
    await expect(
      services.budgets.createBudget({ ...BUDGET, amountCents: 0 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'amountCents' }],
    })
    await expect(
      services.budgets.createBudget({ ...BUDGET, month: '2026-13' }),
    ).rejects.toMatchObject({
      details: [{ field: 'month' }],
    })
    await expect(
      services.budgets.createBudget({ ...BUDGET, costCenterId: 'cc-fr-paris' }),
    ).rejects.toMatchObject({ details: [{ field: 'costCenterId' }] })
  })

  it('un manager peut lire mais pas gérer les budgets', async () => {
    await loginAs(services, 'chloe')
    expect((await services.budgets.listBudgetStatuses()).length).toBeGreaterThan(0)
    await expect(services.budgets.createBudget(BUDGET)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(services.budgets.deleteBudget('bud-be-2026-11')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    await expect(services.budgets.getBudgetDetail('bud-fr-paris-2026-11')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('mois proposés', () => {
  it('sont centrés sur le mois de démonstration', () => {
    const months = monthOptions().map((o) => o.value)
    expect(months).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ])
  })
})
