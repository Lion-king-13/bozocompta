import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { createTestServices, loginAs } from '@/test/helpers'
import type { Services } from './index'

let services: Services

beforeEach(() => {
  services = createTestServices()
})

describe('isolation des données (simulation d’affichage)', () => {
  it('limite un manager à ses entités, plus les transactions qui lui sont imputées', async () => {
    await loginAs(services, 'chloe') // manager Belgique
    const entities = await services.organization.listEntities()
    expect(entities.map((e) => e.id)).toEqual(['ent-be'])
    const txs = (await services.transactions.listTransactions({ pageSize: 200 })).items
    const foreign = txs.filter((t) => t.entityId !== 'ent-be')
    expect(foreign).toEqual([]) // aucune transaction FR n'est imputée à la Belgique
    await expect(services.invoices.listInvoices({ entityId: 'ent-fr' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('montre au manager France le paiement belge imputé au projet France', async () => {
    await loginAs(services, 'david')
    const txs = (await services.transactions.listTransactions({ pageSize: 200 })).items
    expect(txs.map((t) => t.id)).toEqual(expect.arrayContaining(['tx-be-101', 'tx-be-103']))
    expect(txs.some((t) => t.id === 'tx-be-002')).toBe(false)
  })

  it('ne montre à un collaborateur que ses propres cartes', async () => {
    await loginAs(services, 'emma')
    const cards = await services.cards.listCards()
    expect(cards.every((c) => c.holderUserId === 'usr-emma')).toBe(true)
    expect(cards).toHaveLength(2)
  })
})

describe('cohérence entre écrans', () => {
  it('le dashboard, les transactions et les budgets donnent les mêmes chiffres', async () => {
    await loginAs(services, 'alice')
    const summary = await services.dashboard.getSummary()
    const txs = (
      await services.transactions.listTransactions({ pageSize: 200, direction: 'debit' })
    ).items
    const ytd = txs.filter(
      (t) => t.bookingDate >= summary.period.start && t.bookingDate <= summary.period.end,
    )
    expect(summary.spend.imputedTotalCents).toBe(ytd.reduce((a, t) => a + t.amountCents, 0))
    const missing = await services.transactions.listMissingReceipts()
    expect(summary.missingReceiptCount).toBe(missing.length)
    expect(summary.budgets).toEqual(
      await services.budgets.listBudgetStatuses({ month: DEMO_CURRENT_MONTH }),
    )
  })

  it('confirmer ou rejeter une suggestion ne change aucun total', async () => {
    await loginAs(services, 'bruno')
    const before = await services.dashboard.getSummary()
    await services.reconciliations.confirmReconciliation('rec-007')
    await services.reconciliations.rejectReconciliation('rec-008')
    const after = await services.dashboard.getSummary()
    expect(after.spend).toEqual(before.spend)
    expect(after.pendingReconciliationCount).toBe(before.pendingReconciliationCount - 2)
  })

  it('refuse un second rapprochement confirmé sur la même transaction (1 ↔ 1)', async () => {
    await loginAs(services, 'bruno')
    await expect(
      services.reconciliations.createManualReconciliation('inv-010', 'tx-be-101'),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('la ventilation d’une transaction modifie l’imputé mais jamais le total', async () => {
    await loginAs(services, 'alice')
    const before = await services.dashboard.getSummary()
    await services.allocations.replaceAllocations('tx-be-003', [
      { entityId: 'ent-be', costCenterId: null, percentBp: 3333 },
      { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: 6667 },
    ])
    const after = await services.dashboard.getSummary()
    expect(after.spend.imputedTotalCents).toBe(before.spend.imputedTotalCents)
    const fr = await services.dashboard.getSummary({ entityId: 'ent-fr' })
    expect(fr.spend.imputedTotalCents).toBeGreaterThan(0)
    await expect(
      services.allocations.replaceAllocations('tx-be-003', [
        { entityId: 'ent-be', costCenterId: null, percentBp: 9000 },
      ]),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('import PDF (extraction simulée) et confidentialité', () => {
  it('suppression : effet réel en mémoire, puis réinitialisation de la démo', async () => {
    await loginAs(services, 'alice')
    await services.privacy.requestDeletion('organization')
    expect((await services.invoices.listInvoices()).total).toBe(0)
    await services.privacy.resetDemoData()
    expect((await services.invoices.listInvoices()).total).toBeGreaterThan(0)
  })

  it('suppression de son compte : la session est fermée', async () => {
    await loginAs(services, 'farid')
    await services.privacy.requestDeletion('my_account')
    await expect(services.cards.listCards()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('inscription : session simulée dans l’organisation de démonstration', async () => {
    const session = await services.auth.signUp({
      firstName: 'Zoé',
      lastName: 'Test',
      email: 'zoe@exemple.test',
      password: 'demo',
    })
    expect(session.user).toMatchObject({ organizationId: 'org-lumen', role: 'member' })
  })
})
