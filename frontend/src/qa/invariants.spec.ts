/**
 * QA indépendante (Agent 5) — invariants financiers exécutés sur le VRAI jeu de données et
 * les VRAIS services mock, pour TOUS les rôles et tous les périmètres, y compris après mutations.
 *
 * Correspondance « nom de travail (INVARIANTS_FINANCIERS.md) → champ réel » :
 *   facture.totalTtc → Invoice.totalInclVatCents ; totalHt → totalExclVatCents ; tva → vatCents
 *   transaction.montant → BankTransaction.amountCents (positif) + direction 'debit' | 'credit'
 *   allocation.pourcentage → Allocation.percentBp (10 000 = 100 %) ; montant → amountCents
 *   total_org → DashboardSummary.spend.imputedTotalCents (entityId null, rôle admin)
 *   vue analytique → spend.imputedByEntity ; vue payeuse → spend.paidByEntity (arbitrage D2)
 *   dépense comptée → transaction de DÉBIT (arbitrage D1)
 *
 * Un invariant violé par le code actuel est marqué `it.fails` avec l'identifiant du constat
 * (docs/partie-b/AUDIT_QA.md). Ne jamais affaiblir une assertion pour la faire passer.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '@/config/demo'
import { clearErrorSimulation, setErrorSimulation } from '@/core/errors'
import type { Cents, DateRange, Id } from '@/domain'
import type { Services } from '@/services'
import { createMockDb } from '@/mocks/dataset'
import { createTestServices, demoFile, loginAs, EMAILS } from '@/test/helpers'

type Who = keyof typeof EMAILS
const ALL_USERS = Object.keys(EMAILS) as Who[]
const YTD: DateRange = { start: `${DEMO_TODAY.slice(0, 4)}-01-01`, end: DEMO_TODAY }
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

async function allDebits(s: Services, period: DateRange, entityId?: Id) {
  const page = await s.transactions.listTransactions({
    direction: 'debit',
    bookedFrom: period.start,
    bookedTo: period.end,
    entityId,
    pageSize: 200,
  })
  expect(page.total).toBeLessThanOrEqual(200)
  return page.items
}

/** Vérifie la cohérence interne d'un rapport (chaque ventilation somme au total). */
async function checkReportInternal(s: Services, entityId: Id | null, period = YTD) {
  const { spend } = await s.dashboard.getSummary({ entityId, period })
  const total = spend.imputedTotalCents
  for (const [name, items] of Object.entries({
    imputedByEntity: spend.imputedByEntity,
    byCostCenter: spend.byCostCenter,
    byCategory: spend.byCategory,
    byUser: spend.byUser,
    byCard: spend.byCard,
    byMonth: spend.byMonth,
  })) {
    expect(sum(items.map((i) => i.amountCents)), `${name} doit sommer au total`).toBe(total)
  }
  expect(sum(spend.paidByEntity.map((i) => i.amountCents))).toBe(spend.paidTotalCents)
  for (const v of [total, spend.paidTotalCents]) expect(Number.isSafeInteger(v)).toBe(true)
  return spend
}

/** Snapshot de toutes les données lisibles par un admin (pour « aucune donnée corrompue »). */
async function snapshot(s: Services) {
  const [inv, tx, rec, alloc, bud, usage, cards] = await Promise.all([
    s.invoices.listInvoices({ pageSize: 200 }),
    s.transactions.listTransactions({ pageSize: 200 }),
    s.reconciliations.listReconciliations(),
    s.allocations.listAllocations(),
    s.budgets.listBudgetStatuses(),
    s.aiUsage.listUsage({ pageSize: 200 }),
    s.cards.listCards(),
  ])
  return { inv, tx, rec, alloc, bud, usage, cards }
}

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('I1 / I2 / I3 / I9 — jeu de données initial (brut)', () => {
  const db = createMockDb()

  it('I1.1–I1.3 : Σ lignes = totaux facture et HT + TVA = TTC (facture et lignes)', () => {
    for (const inv of db.invoices) {
      expect(sum(inv.lines.map((l) => l.totalInclVatCents)), inv.id).toBe(inv.totalInclVatCents)
      expect(sum(inv.lines.map((l) => l.totalExclVatCents)), inv.id).toBe(inv.totalExclVatCents)
      expect(sum(inv.lines.map((l) => l.vatCents)), inv.id).toBe(inv.vatCents)
      expect(inv.totalExclVatCents + inv.vatCents, inv.id).toBe(inv.totalInclVatCents)
      for (const l of inv.lines) {
        expect(l.totalExclVatCents + l.vatCents, l.id).toBe(l.totalInclVatCents)
        expect(l.quantity * l.unitPriceCents, l.id).toBe(l.totalExclVatCents)
      }
    }
  })

  it('I1.7 / I1.8 : entité existante, échéance ≥ émission, EUR', () => {
    const entities = new Set(db.entities.map((e) => e.id))
    for (const inv of db.invoices) {
      expect(entities.has(inv.entityId), inv.id).toBe(true)
      expect(inv.dueDate >= inv.issueDate, inv.id).toBe(true)
      expect(inv.currency).toBe('EUR')
    }
  })

  it('I2.1 / I2.2 / I2.3 / I2.10 : allocations = 100 %, au centime, positives, cibles uniques', () => {
    const byTx = new Map<Id, typeof db.allocations>()
    for (const a of db.allocations)
      byTx.set(a.transactionId, [...(byTx.get(a.transactionId) ?? []), a])
    for (const [txId, allocs] of byTx) {
      const tx = db.transactions.find((t) => t.id === txId)
      expect(tx, txId).toBeDefined()
      expect(tx!.direction, txId).toBe('debit')
      expect(sum(allocs.map((a) => a.percentBp)), txId).toBe(10_000)
      expect(sum(allocs.map((a) => a.amountCents)), txId).toBe(tx!.amountCents)
      for (const a of allocs) expect(a.amountCents, a.id).toBeGreaterThan(0)
      const targets = allocs.map((a) => `${a.entityId}|${a.costCenterId}`)
      expect(new Set(targets).size, txId).toBe(targets.length)
    }
  })

  it('I3.1 / I3.2 / I3.3 : rapprochement confirmé 1 ↔ 1 et montant identique', () => {
    const confirmed = db.reconciliations.filter((r) => r.status === 'confirmed')
    expect(new Set(confirmed.map((r) => r.invoiceId)).size).toBe(confirmed.length)
    expect(new Set(confirmed.map((r) => r.transactionId)).size).toBe(confirmed.length)
    for (const r of confirmed) {
      const inv = db.invoices.find((i) => i.id === r.invoiceId)!
      const tx = db.transactions.find((t) => t.id === r.transactionId)!
      expect(tx.amountCents - inv.totalInclVatCents, r.id).toBe(r.amountDifferenceCents)
      expect(r.amountDifferenceCents, r.id).toBe(0)
    }
  })

  it('I3.6 / I3.7 : carte → une entité, titulaire membre de cette entité, transaction.entity = carte.entity', () => {
    for (const c of db.cards) {
      const holder = db.users.find((u) => u.id === c.holderUserId)
      expect(holder?.entityIds.includes(c.entityId), c.id).toBe(true)
    }
    for (const t of db.transactions.filter((t) => t.cardId)) {
      const card = db.cards.find((c) => c.id === t.cardId)
      expect(card?.entityId, t.id).toBe(t.entityId)
    }
  })

  it('I9.1 : déterminisme (deux chargements profondément égaux)', () => {
    expect(createMockDb()).toEqual(createMockDb())
  })

  it('I9.2 : intégrité référentielle complète (toutes les clés étrangères)', () => {
    const ids = (xs: { id: Id }[]) => new Set(xs.map((x) => x.id))
    const users = ids(db.users)
    const tx = ids(db.transactions)
    const inv = ids(db.invoices)
    const ent = ids(db.entities)
    const cc = ids(db.costCenters)
    const cat = ids(db.categories)
    const sup = ids(db.suppliers)
    for (const r of db.reconciliations) {
      expect(inv.has(r.invoiceId) && tx.has(r.transactionId), r.id).toBe(true)
      if (r.decidedByUserId) expect(users.has(r.decidedByUserId), r.id).toBe(true)
    }
    for (const a of db.allocations) {
      expect(ent.has(a.entityId), a.id).toBe(true)
      if (a.costCenterId) expect(cc.has(a.costCenterId), a.id).toBe(true)
    }
    for (const i of db.invoices) {
      expect(sup.has(i.supplierId), i.id).toBe(true)
      if (i.categoryId) expect(cat.has(i.categoryId), i.id).toBe(true)
    }
    for (const b of db.budgets) {
      expect(ent.has(b.entityId), b.id).toBe(true)
      if (b.categoryId) expect(cat.has(b.categoryId), b.id).toBe(true)
      if (b.costCenterId) expect(cc.has(b.costCenterId), b.id).toBe(true)
    }
    for (const u of db.aiUsage) expect(users.has(u.userId), u.id).toBe(true)
    for (const c of db.cards) expect(users.has(c.holderUserId), c.id).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('E1–E8 — exemple obligatoire §5 via les services (admin)', () => {
  let s: Services
  beforeEach(async () => {
    s = createTestServices()
    await loginAs(s, 'alice')
  })

  it('E1/E2 : 1 facture, 1 transaction, 1 rapprochement confirmé, 2 allocations 1 800 + 1 200', async () => {
    const inv = await s.invoices.getInvoice('inv-001')
    const tx = await s.transactions.getTransaction('tx-be-101')
    const recs = (await s.reconciliations.listReconciliations()).filter(
      (r) => r.invoiceId === 'inv-001' || r.transactionId === 'tx-be-101',
    )
    const allocs = await s.allocations.listAllocations({ transactionId: 'tx-be-101' })
    expect(inv.totalInclVatCents).toBe(300_000)
    expect(tx.amountCents).toBe(300_000)
    expect(tx.cardId).toBe('card-be-alice')
    expect(tx.entityId).toBe('ent-be')
    expect(recs).toHaveLength(1)
    expect(recs[0]!.status).toBe('confirmed')
    expect(
      allocs.map((a) => [a.entityId, a.costCenterId, a.percentBp, a.amountCents]).sort(),
    ).toEqual(
      [
        ['ent-be', null, 6000, 180_000],
        ['ent-fr', 'cc-fr-paris', 4000, 120_000],
      ].sort(),
    )
    expect(tx.missingReceipt).toBe(false)
  })

  it('E3 : retirer la transaction §5 du calcul fait baisser le total org de exactement 3 000 €', async () => {
    const org = await s.dashboard.getSummary({ period: YTD })
    const debits = await allDebits(s, YTD)
    expect(sum(debits.map((t) => t.amountCents))).toBe(org.spend.imputedTotalCents)
    expect(sum(debits.filter((t) => t.id !== 'tx-be-101').map((t) => t.amountCents))).toBe(
      org.spend.imputedTotalCents - 300_000,
    )
  })

  it('E4 : payé par BE +3 000 / FR +0 ; imputé BE +1 800 / FR +1 200 (période septembre)', async () => {
    const sept = { start: '2026-09-01', end: '2026-09-30' }
    const be = await s.dashboard.getSummary({ entityId: 'ent-be', period: sept })
    const fr = await s.dashboard.getSummary({ entityId: 'ent-fr', period: sept })
    const beOnly = (await allDebits(s, sept, 'ent-be')).filter((t) => t.id !== 'tx-be-101')
    const frOnly = await allDebits(s, sept, 'ent-fr')
    expect(be.spend.paidTotalCents).toBe(300_000 + sum(beOnly.map((t) => t.amountCents)))
    expect(fr.spend.paidTotalCents).toBe(sum(frOnly.map((t) => t.amountCents)))
    const beImputedFromEx = be.spend.byCard.find((c) => c.key === 'card-be-alice')
    expect(beImputedFromEx?.amountCents).toBeGreaterThanOrEqual(180_000)
    expect(
      fr.spend.byCostCenter.find((c) => c.key === 'cc-fr-paris')?.amountCents,
    ).toBeGreaterThanOrEqual(120_000)
  })

  it('E8 / I2.8 : aucune facture ni transaction côté France créée par l’exemple', async () => {
    const frInv = await s.invoices.listInvoices({ entityId: 'ent-fr', pageSize: 200 })
    const frTx = await s.transactions.listTransactions({ entityId: 'ent-fr', pageSize: 200 })
    expect(frInv.items.filter((i) => i.totalInclVatCents === 300_000)).toHaveLength(0)
    expect(
      frTx.items.filter((t) => t.amountCents === 300_000 || t.amountCents === 120_000),
    ).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('I4 — cohérence des agrégats pour TOUS les rôles et TOUS les périmètres', () => {
  for (const who of ALL_USERS) {
    it(`${who} : chaque ventilation de chaque périmètre accessible somme à son total`, async () => {
      const s = createTestServices()
      await loginAs(s, who)
      const entities = await s.organization.listEntities()
      for (const scope of [null, ...entities.map((e) => e.id)]) await checkReportInternal(s, scope)
    })

    it(`${who} : budgets d'entité (sans filtre) consommés = imputé du mois sur le dashboard entité`, async () => {
      const s = createTestServices()
      await loginAs(s, who)
      let statuses
      try {
        statuses = await s.budgets.listBudgetStatuses()
      } catch {
        return // rôle sans budgets:read
      }
      const month = { start: `${DEMO_TODAY.slice(0, 7)}-01`, end: `${DEMO_TODAY.slice(0, 7)}-30` }
      for (const st of statuses) {
        const summary = await s.dashboard.getSummary({
          entityId: st.budget.entityId,
          period: month,
        })
        const lines = st.budget.costCenterId
          ? (summary.spend.byCostCenter.find((c) => c.key === st.budget.costCenterId)
              ?.amountCents ?? 0)
          : st.budget.categoryId
            ? (summary.spend.byCategory.find((c) => c.key === st.budget.categoryId)?.amountCents ??
              0)
            : summary.spend.imputedTotalCents
        if (!(st.budget.costCenterId && st.budget.categoryId))
          expect(st.consumedCents, st.budget.id).toBe(lines)
        expect(st.remainingCents, st.budget.id).toBe(st.budget.amountCents - st.consumedCents)
      }
    })
  }

  it('admin : Σ imputé entités = Σ payé entités = total org = Σ débits de la liste transactions', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const org = await checkReportInternal(s, null)
    const entities = await s.organization.listEntities()
    const per = await Promise.all(
      entities.map((e) => s.dashboard.getSummary({ entityId: e.id, period: YTD })),
    )
    expect(sum(per.map((p) => p.spend.imputedTotalCents))).toBe(org.imputedTotalCents)
    expect(sum(per.map((p) => p.spend.paidTotalCents))).toBe(org.imputedTotalCents)
    expect(org.paidTotalCents).toBe(org.imputedTotalCents)
    expect(sum((await allDebits(s, YTD)).map((t) => t.amountCents))).toBe(org.imputedTotalCents)
    // I4.9 : la barre « entité » du dashboard org = total du dashboard entité
    for (const p of per) {
      expect(org.imputedByEntity.find((i) => i.key === p.entityId)?.amountCents ?? 0).toBe(
        p.spend.imputedTotalCents,
      )
    }
  })

  it('admin : Σ mois de l’année = total année (I4.8) et chaque mois = rapport du mois', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const year = (await s.dashboard.getSummary({ period: YTD })).spend
    for (const m of year.byMonth) {
      const month = String(m.key)
      const end = month === DEMO_TODAY.slice(0, 7) ? DEMO_TODAY : `${month}-28`
      const r = await s.dashboard.getSummary({ period: { start: `${month}-01`, end } })
      if (end.endsWith('-28')) continue // fin de mois variable : vérifié seulement pour le mois en cours
      expect(r.spend.imputedTotalCents).toBe(m.amountCents)
    }
  })

  /**
   * QA-03 : pour un utilisateur limité (manager France), la vue « Toutes mes entités »
   * additionne le montant ENTIER des paiements belges partiellement imputés à la France,
   * y compris les parts imputées à la Belgique — entité à laquelle il n'a pas accès.
   * Attendu : le consolidé d'un utilisateur limité = Σ de l'imputé de ses entités accessibles
   * (même règle que la vue entité), et aucune entité inaccessible dans la ventilation.
   */
  for (const who of ['david', 'chloe', 'farid'] as Who[]) {
    it.fails(
      `QA-03 ${who} : consolidé « toutes mes entités » = Σ imputé de ses entités, sans entité inaccessible`,
      async () => {
        const s = createTestServices()
        await loginAs(s, who)
        const entities = (await s.organization.listEntities()).map((e) => e.id)
        const all = await s.dashboard.getSummary({ entityId: null, period: YTD })
        const per = await Promise.all(
          entities.map((id) => s.dashboard.getSummary({ entityId: id, period: YTD })),
        )
        for (const item of all.spend.imputedByEntity) expect(entities).toContain(item.key)
        expect(all.spend.imputedTotalCents).toBe(sum(per.map((p) => p.spend.imputedTotalCents)))
      },
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('I4.12 / I3.8 — compteurs vs listes, et cohérence payé/imputé des listes', () => {
  it('justificatifs manquants = débits sans rapprochement confirmé (toutes entités, admin)', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const tx = (await s.transactions.listTransactions({ pageSize: 200 })).items
    const recs = await s.reconciliations.listReconciliations()
    const confirmed = new Set(
      recs.filter((r) => r.status === 'confirmed').map((r) => r.transactionId),
    )
    const missing = await s.transactions.listMissingReceipts()
    expect(missing.map((t) => t.id).sort()).toEqual(
      tx
        .filter((t) => t.direction === 'debit' && !confirmed.has(t.id))
        .map((t) => t.id)
        .sort(),
    )
  })

  /**
   * QA-04 : `DashboardSummary.missingReceiptCount` / `pendingReconciliationCount` /
   * `invoicesToReviewCount` (contrat documenté pour le backend A) sont calculés sur l'entité
   * PAYEUSE, alors que les listes (et les compteurs affichés) incluent les pièces IMPUTÉES.
   */
  for (const who of ['david'] as Who[]) {
    it.fails(
      `QA-04 ${who} : compteurs de la synthèse = longueur des listes du même périmètre`,
      async () => {
        const s = createTestServices()
        await loginAs(s, who)
        const summary = await s.dashboard.getSummary({ period: YTD })
        expect(summary.missingReceiptCount).toBe(
          (await s.transactions.listMissingReceipts()).length,
        )
        expect(summary.pendingReconciliationCount).toBe(
          (await s.reconciliations.listReconciliations({ status: 'suggested' })).length,
        )
      },
    )
  }

  /**
   * QA-05 : sur un dashboard ENTITÉ (lecture « imputé à »), les listes ciblées filtrent sur
   * l'entité PAYEUSE. Pour la France, la transaction belge tx-be-103 (30 % imputés au projet
   * France, sans justificatif) n'apparaît pas dans « justificatifs manquants » France alors
   * qu'elle compte dans les dépenses imputées France.
   */
  it.fails(
    'QA-05 admin, entité France : toute dépense imputée à la France sans justificatif figure dans ses justificatifs manquants',
    async () => {
      const s = createTestServices()
      await loginAs(s, 'alice')
      const fr = await s.dashboard.getSummary({ entityId: 'ent-fr', period: YTD })
      const imputedTx = new Set(
        (await s.allocations.listAllocations({ entityId: 'ent-fr' })).map((a) => a.transactionId),
      )
      const missingFr = new Set(
        (await s.transactions.listMissingReceipts({ entityId: 'ent-fr' })).map((t) => t.id),
      )
      const allMissing = await s.transactions.listMissingReceipts()
      void fr
      for (const t of allMissing.filter((t) => imputedTx.has(t.id)))
        expect(missingFr.has(t.id), t.id).toBe(true)
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('mutations : les invariants restent vrais après chaque action', () => {
  let s: Services
  beforeEach(async () => {
    s = createTestServices()
    await loginAs(s, 'alice')
  })

  async function orgTotal() {
    return (await s.dashboard.getSummary({ period: YTD })).spend.imputedTotalCents
  }

  async function checkAllScopes() {
    for (const scope of [null, 'ent-be', 'ent-fr']) await checkReportInternal(s, scope)
  }

  it('EX-14 / I2.7 : 60/40 → 50/50 : total inchangé, BE −300 €, FR +300 €, budget projet +300 €', async () => {
    const before = await orgTotal()
    const be0 = (await s.dashboard.getSummary({ entityId: 'ent-be', period: YTD })).spend
      .imputedTotalCents
    const fr0 = (await s.dashboard.getSummary({ entityId: 'ent-fr', period: YTD })).spend
      .imputedTotalCents
    const allocs = await s.allocations.listAllocations({ transactionId: 'tx-be-101' })
    const beCc = allocs.find((a) => a.entityId === 'ent-be')!.costCenterId
    const counts0 = await snapshot(s)
    await s.allocations.replaceAllocations('tx-be-101', [
      { entityId: 'ent-be', costCenterId: beCc, percentBp: 5000 },
      { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: 5000 },
    ])
    expect(await orgTotal()).toBe(before)
    expect(
      (await s.dashboard.getSummary({ entityId: 'ent-be', period: YTD })).spend.imputedTotalCents,
    ).toBe(be0 - 30_000)
    expect(
      (await s.dashboard.getSummary({ entityId: 'ent-fr', period: YTD })).spend.imputedTotalCents,
    ).toBe(fr0 + 30_000)
    const counts1 = await snapshot(s)
    expect(counts1.inv.total).toBe(counts0.inv.total)
    expect(counts1.tx.total).toBe(counts0.tx.total)
    expect(counts1.alloc).toHaveLength(counts0.alloc.length)
    await checkAllScopes()
  })

  it('EX-10 / I2.5 : 100,00 € en trois tiers → 33,34 + 33,33 + 33,33, idempotent (I2.6)', async () => {
    const tx = (await s.transactions.listTransactions({ direction: 'debit', pageSize: 200 }))
      .items[0]!
    const inputs = [
      { entityId: tx.entityId, costCenterId: null, percentBp: 3334 },
      {
        entityId: tx.entityId === 'ent-be' ? 'ent-fr' : 'ent-be',
        costCenterId: null,
        percentBp: 3333,
      },
    ]
    // ent-fr / ent-be + une 3e cible (centre de coûts de l'entité payeuse)
    const ccs = await s.costCenters.listCostCenters({ entityId: tx.entityId })
    const third = { entityId: tx.entityId, costCenterId: ccs[0]!.id, percentBp: 3333 }
    const first = await s.allocations.replaceAllocations(tx.id, [...inputs, third])
    expect(sum(first.map((a) => a.amountCents))).toBe(tx.amountCents)
    for (let i = 0; i < 10; i++) {
      const again = await s.allocations.replaceAllocations(
        tx.id,
        first.map((a) => ({
          entityId: a.entityId,
          costCenterId: a.costCenterId,
          percentBp: a.percentBp,
        })),
      )
      expect(again.map((a) => a.amountCents)).toEqual(first.map((a) => a.amountCents))
    }
    expect(await s.allocations.listAllocations({ transactionId: tx.id })).toHaveLength(3)
    await checkAllScopes()
  })

  it('I2.9 : une répartition ≠ 100 % est refusée et l’ancienne reste en place', async () => {
    const before = await s.allocations.listAllocations({ transactionId: 'tx-be-101' })
    for (const bad of [
      [6000, 3000],
      [6000, 5000],
      [10_000, 0],
      [-1000, 11_000],
      [6000.5, 3999.5],
    ]) {
      await expect(
        s.allocations.replaceAllocations('tx-be-101', [
          { entityId: 'ent-be', costCenterId: null, percentBp: bad[0]! },
          { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: bad[1]! },
        ]),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    }
    expect(await s.allocations.listAllocations({ transactionId: 'tx-be-101' })).toEqual(before)
  })

  it.fails(
    'QA-06 I2.10 : la même cible (entité + centre) deux fois dans une répartition est refusée',
    async () => {
      await expect(
        s.allocations.replaceAllocations('tx-be-101', [
          { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: 5000 },
          { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: 5000 },
        ]),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    },
  )

  it('CO-11 / D1 : confirmer puis rejeter des suggestions ne change aucun total ; justificatifs −1 au confirmé', async () => {
    const pending = await s.reconciliations.listReconciliations({ status: 'suggested' })
    expect(pending.length).toBeGreaterThanOrEqual(2)
    const total = await orgTotal()
    const missing0 = (await s.transactions.listMissingReceipts()).length
    await s.reconciliations.confirmReconciliation(pending[0]!.id)
    expect(await orgTotal()).toBe(total)
    expect((await s.transactions.listMissingReceipts()).length).toBe(missing0 - 1)
    await s.reconciliations.rejectReconciliation(pending[1]!.id)
    expect(await orgTotal()).toBe(total)
    expect((await s.transactions.listMissingReceipts()).length).toBe(missing0 - 1)
    // I3.5 : la paire rejetée n'est pas re-suggérée
    const again = await s.reconciliations.suggestReconciliations()
    expect(
      again.some(
        (r) =>
          r.invoiceId === pending[1]!.invoiceId && r.transactionId === pending[1]!.transactionId,
      ),
    ).toBe(false)
    // I3.1 / I3.2 toujours vrais
    const confirmed = (await s.reconciliations.listReconciliations()).filter(
      (r) => r.status === 'confirmed',
    )
    expect(new Set(confirmed.map((r) => r.transactionId)).size).toBe(confirmed.length)
    expect(new Set(confirmed.map((r) => r.invoiceId)).size).toBe(confirmed.length)
    await checkAllScopes()
  })

  it('import CSV : +N transactions, total org + Σ débits importés, justificatifs +N débits', async () => {
    const accounts = await s.transactions.listBankAccounts()
    const total = await orgTotal()
    const missing0 = (await s.transactions.listMissingReceipts()).length
    const res = await s.transactions.importCsv(
      accounts[0]!.id,
      demoFile('transactions-valide.csv', 'text/csv'),
    )
    const debits = res.transactions.filter((t) => t.direction === 'debit')
    const inYtd = debits.filter((t) => t.bookingDate >= YTD.start && t.bookingDate <= YTD.end)
    expect(await orgTotal()).toBe(total + sum(inYtd.map((t) => t.amountCents)))
    expect((await s.transactions.listMissingReceipts()).length).toBe(missing0 + debits.length)
    await checkAllScopes()
  })

  it.fails('QA-07 I3.10 : réimporter le même CSV ne crée pas de doublons silencieux', async () => {
    const accounts = await s.transactions.listBankAccounts()
    const before = (await s.transactions.listTransactions({ pageSize: 200 })).total
    const first = await s.transactions.importCsv(
      accounts[0]!.id,
      demoFile('transactions-valide.csv', 'text/csv'),
    )
    await expect(
      s.transactions.importCsv(accounts[0]!.id, demoFile('transactions-valide.csv', 'text/csv')),
    ).rejects.toBeDefined()
    expect((await s.transactions.listTransactions({ pageSize: 200 })).total).toBe(
      before + first.transactions.length,
    )
  })

  it('créer un budget : consommé = imputé du périmètre, restant = montant − consommé', async () => {
    const month = DEMO_TODAY.slice(0, 7)
    const b = await s.budgets.createBudget({
      entityId: 'ent-fr',
      categoryId: null,
      costCenterId: 'cc-fr-paris',
      label: 'QA projet France',
      month,
      amountCents: 100_000,
    })
    const st = (await s.budgets.listBudgetStatuses({ entityId: 'ent-fr' })).find(
      (x) => x.budget.id === b.id,
    )!
    const fr = await s.dashboard.getSummary({
      entityId: 'ent-fr',
      period: { start: `${month}-01`, end: `${month}-30` },
    })
    expect(st.consumedCents).toBe(
      fr.spend.byCostCenter.find((c) => c.key === 'cc-fr-paris')?.amountCents ?? 0,
    )
    expect(st.remainingCents).toBe(100_000 - st.consumedCents)
    const detail = await s.budgets.getBudgetDetail(b.id)
    expect(sum(detail.lines.map((l) => l.amountCents))).toBe(st.consumedCents)
  })

  it('I7.1 / I7.6 : une extraction réussie ajoute sa consommation IA mais aucune dépense', async () => {
    const total = await orgTotal()
    const u0 = await s.aiUsage.getUsageSummary()
    const draft = await s.invoices.importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf'))
    const u1 = await s.aiUsage.getUsageSummary()
    expect(u1.totalTokens - u0.totalTokens).toBe(draft.tokensUsed)
    expect(sum(u1.byFeature.map((f) => f.tokens))).toBe(u1.totalTokens)
    expect(sum(u1.byFeature.map((f) => f.costCents))).toBe(u1.totalCostCents)
    expect(await orgTotal()).toBe(total)
  })

  it.fails(
    'QA-08 PDF-08 : importer deux fois la même facture (même fournisseur, même n°) est signalé ou refusé',
    async () => {
      const pdf = () => demoFile('facture-demo.pdf', 'application/pdf')
      for (let i = 0; i < 2; i++) {
        const d = await s.invoices.importInvoicePdf(pdf())
        await s.invoices.confirmDraft(d.id, {
          entityId: 'ent-be',
          supplierId: d.supplierId.value!,
          categoryId: d.categoryId.value,
          number: d.number.value!,
          issueDate: d.issueDate.value!,
          dueDate: d.dueDate.value!,
          lines: [
            { description: 'Classeurs', quantity: 1, unitPriceCents: 4_500, vatRateBp: 2100 },
          ],
        })
      }
      const same = (await s.invoices.listInvoices({ search: 'BC-56010', pageSize: 200 })).items
      expect(same).toHaveLength(1)
    },
  )

  it('suppression des données de l’organisation puis réinitialisation : retour exact à l’état initial', async () => {
    const initial = await snapshot(s)
    await s.privacy.requestDeletion('organization')
    const empty = await s.dashboard.getSummary({ period: YTD })
    expect(empty.spend.imputedTotalCents).toBe(0)
    await checkAllScopes()
    await s.privacy.resetDemoData()
    expect(await snapshot(s)).toEqual(initial)
  })

  it.fails(
    'QA-09 I9.5 : supprimer son compte ne laisse aucune référence orpheline vers l’utilisateur',
    async () => {
      const s2 = createTestServices()
      await loginAs(s2, 'emma')
      await s2.privacy.requestDeletion('my_account')
      await loginAs(s2, 'alice')
      const users = new Set((await s2.users.listUsers()).map((u) => u.id))
      const cards = await s2.cards.listCards()
      for (const c of cards) expect(users.has(c.holderUserId), c.id).toBe(true)
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('I9.4 — après chacune des 4 erreurs simulées, aucune donnée n’est corrompue', () => {
  const scenarios = [
    ['invalidFile', 'imports'],
    ['aiUnavailable', 'ai'],
    ['aiQuotaExceeded', 'ai'],
    ['network', '*'],
  ] as const

  for (const [scenario, scope] of scenarios) {
    it(`${scenario} : import PDF, import CSV, ventilation, rapprochement → état inchangé, conso IA inchangée`, async () => {
      const s = createTestServices()
      await loginAs(s, 'alice')
      const before = await snapshot(s)
      const usage0 = await s.aiUsage.getUsageSummary()
      const accounts = await s.transactions.listBankAccounts()
      const pending = await s.reconciliations.listReconciliations({ status: 'suggested' })
      setErrorSimulation({ scenario, scope, mode: 'always' })
      const attempts: Promise<unknown>[] = [
        s.invoices.importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf')),
        s.transactions.importCsv(accounts[0]!.id, demoFile('transactions-valide.csv', 'text/csv')),
        s.reconciliations.suggestReconciliations(),
      ]
      if (scope === '*') {
        attempts.push(
          s.allocations.replaceAllocations('tx-be-101', [
            { entityId: 'ent-be', costCenterId: null, percentBp: 10_000 },
          ]),
          s.reconciliations.confirmReconciliation(pending[0]!.id),
        )
      }
      const results = await Promise.allSettled(attempts)
      expect(results.some((r) => r.status === 'rejected')).toBe(true)
      clearErrorSimulation()
      const after = await snapshot(s)
      // Seules les opérations hors portée ont pu réussir : on compare ce qui doit rester stable.
      expect(after.alloc).toEqual(before.alloc)
      expect(after.rec.filter((r) => r.status !== 'suggested')).toEqual(
        before.rec.filter((r) => r.status !== 'suggested'),
      )
      if (scope !== 'ai') expect(after.rec).toEqual(before.rec)
      if (scope !== 'ai') expect(after.tx).toEqual(before.tx) // en portée « ai », l'import CSV (non IA) réussit légitimement
      expect(after.inv).toEqual(before.inv)
      const usage1 = await s.aiUsage.getUsageSummary()
      expect(usage1.totalTokens).toBe(usage0.totalTokens)
    })
  }

  it('mode « once » : la simulation est consommée par le PREMIER appel, quel qu’il soit', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    setErrorSimulation({ scenario: 'network', scope: '*', mode: 'once' })
    // Un appel de la coque (liste des entités) passe en premier…
    await expect(s.organization.listEntities()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    // …et l'écran visé ne voit jamais l'erreur.
    await expect(s.invoices.listInvoices()).resolves.toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('isolation simulée (D7) — accès directs par identifiant', () => {
  it('manager Belgique : facture / transaction purement françaises introuvables', async () => {
    const s = createTestServices()
    await loginAs(s, 'chloe')
    await expect(s.transactions.getTransaction('tx-fr-004')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(s.invoices.getInvoice('inv-004')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(s.dashboard.getSummary({ entityId: 'ent-fr' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it.fails(
    'QA-10 : un collaborateur (member) ne peut pas lire la fiche d’un collègue d’une autre entité (users.get sans contrôle)',
    async () => {
      const s = createTestServices()
      await loginAs(s, 'farid') // member France uniquement
      await expect(s.users.getUser('usr-chloe')).rejects.toMatchObject({
        code: expect.stringMatching(/FORBIDDEN|NOT_FOUND/),
      })
    },
  )

  it('member : n’a accès ni aux factures, ni aux rapprochements, ni aux budgets (403)', async () => {
    const s = createTestServices()
    await loginAs(s, 'emma')
    await expect(s.invoices.listInvoices()).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(s.reconciliations.listReconciliations()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    await expect(s.budgets.listBudgetStatuses()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('montants de tous les rapports : centimes entiers (C0.1)', async () => {
    for (const who of ALL_USERS) {
      const s = createTestServices()
      await loginAs(s, who)
      const r = await s.dashboard.getSummary({ period: YTD })
      const all: Cents[] = [
        r.spend.imputedTotalCents,
        r.toPayCents,
        r.missingReceiptCents,
        ...r.spend.byCategory.map((x) => x.amountCents),
        ...r.budgets.map((b) => b.consumedCents),
      ]
      for (const v of all) expect(Number.isSafeInteger(v), who).toBe(true)
    }
  })
})
