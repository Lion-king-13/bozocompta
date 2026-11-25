/**
 * QA indépendante (Agent 5) — contre-vérification après corrections (D7 précisé, H5 remplacée,
 * D14–D19). Règles de visibilité et de cohérence vérifiées pour TOUS les comptes et TOUS les
 * périmètres ; nouveaux défauts marqués `it.fails` avec l'identifiant du constat (AUDIT_QA.md).
 */
import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '@/config/demo'
import type { DateRange, Id } from '@/domain'
import type { Services } from '@/services'
import { createTestServices, EMAILS } from '@/test/helpers'

type Who = keyof typeof EMAILS
const ALL = Object.keys(EMAILS) as Who[]
const YTD: DateRange = { start: `${DEMO_TODAY.slice(0, 4)}-01-01`, end: DEMO_TODAY }
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

async function session(who: Who): Promise<{ s: Services; entities: Id[]; userId: Id }> {
  const s = createTestServices()
  const session = await s.auth.login({ email: EMAILS[who], password: 'demo' })
  const entities = (await s.organization.listEntities()).map((e) => e.id)
  return { s, entities, userId: session.user.id }
}

async function orNull<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f()
  } catch (e) {
    if ((e as { code?: string }).code === 'FORBIDDEN') return null
    throw e
  }
}

describe('D19 — compteurs de la synthèse = longueur des listes, pour chaque compte et périmètre', () => {
  for (const who of ALL) {
    it(who, async () => {
      const { s, entities } = await session(who)
      for (const scope of [null, ...entities]) {
        const q = scope ? { entityId: scope } : {}
        const sm = await s.dashboard.getSummary({ entityId: scope, period: YTD })
        const missing = await orNull(() => s.transactions.listMissingReceipts(q))
        const pending = await orNull(() =>
          s.reconciliations.listReconciliations({ status: 'suggested', ...q }),
        )
        const toReview = await orNull(() =>
          s.invoices.listInvoices({ status: 'to_review', pageSize: 200, ...q }),
        )
        const label = `${who} / ${scope ?? 'tout'}`
        expect(sm.missingReceiptCount, label).toBe(missing?.length ?? 0)
        expect(sm.missingReceiptCents, label).toBe(sum((missing ?? []).map((t) => t.amountCents)))
        expect(sm.pendingReconciliationCount, label).toBe(pending?.length ?? 0)
        expect(sm.invoicesToReviewCount, label).toBe(toReview?.total ?? 0)
      }
    })
  }
})

describe('D7 précisé — totaux d’un utilisateur limité = parts imputées à ses entités', () => {
  for (const who of ALL) {
    it(`${who} : « toutes mes entités » = Σ de ses dashboards d’entité, sans entité inaccessible`, async () => {
      const { s, entities } = await session(who)
      const all = (await s.dashboard.getSummary({ period: YTD })).spend
      const per = await Promise.all(
        entities.map((id) => s.dashboard.getSummary({ entityId: id, period: YTD })),
      )
      for (const item of all.imputedByEntity) expect(entities).toContain(item.key)
      expect(all.imputedTotalCents).toBe(sum(per.map((p) => p.spend.imputedTotalCents)))
    })

    /** Piste (c) : total imputé d'une liste filtrée par entité = dashboard de l'entité. */
    it(`${who} : Σ des parts imputées de la liste Transactions filtrée par entité = dashboard de l’entité`, async () => {
      const { s, entities } = await session(who)
      for (const entityId of entities) {
        const page = await s.transactions.listTransactions({
          entityId,
          direction: 'debit',
          bookedFrom: YTD.start,
          bookedTo: YTD.end,
          pageSize: 200,
        })
        const listed = sum(
          page.items.flatMap((t) =>
            t.imputations.filter((i) => i.entityId === entityId).map((i) => i.amountCents),
          ),
        )
        const dash = await s.dashboard.getSummary({ entityId, period: YTD })
        expect(listed, `${who} / ${entityId}`).toBe(dash.spend.imputedTotalCents)
        for (const t of page.items) {
          expect(sum(t.imputations.map((i) => i.amountCents)), t.id).toBe(t.amountCents)
        }
      }
    })
  }
})

describe('H5 remplacée — minimisation des dépenses nominatives', () => {
  for (const who of ['emma', 'farid'] as Who[]) {
    it(`${who} (member) : uniquement ses cartes, ses dépenses, aucune facture`, async () => {
      const { s, userId } = await session(who)
      const cards = await s.cards.listCards()
      const own = new Set(cards.filter((c) => c.holderUserId === userId).map((c) => c.id))
      expect(cards.every((c) => c.holderUserId === userId)).toBe(true)
      const tx = (await s.transactions.listTransactions({ pageSize: 200 })).items
      for (const t of tx) expect(t.cardId && own.has(t.cardId), t.id).toBe(true)
      const spend = (await s.dashboard.getSummary({ period: YTD })).spend
      for (const u of spend.byUser) expect([userId]).toContain(u.key)
      for (const c of spend.byCard) expect(own.has(String(c.key)), String(c.key)).toBe(true)
      await expect(s.invoices.listInvoices()).rejects.toMatchObject({ code: 'FORBIDDEN' })
      await expect(s.users.getUser('usr-alice')).rejects.toBeDefined()
    })
  }

  for (const who of ['chloe', 'david'] as Who[]) {
    it(`${who} (manager) : porteurs nommés = membres de ses entités, les autres sans nom (clé null)`, async () => {
      const { s, entities } = await session(who)
      const users = await s.users.listUsers()
      const named = new Set(
        users.filter((u) => u.entityIds.some((e) => entities.includes(e))).map((u) => u.id),
      )
      const spend = (await s.dashboard.getSummary({ period: YTD })).spend
      for (const u of spend.byUser) if (u.key !== null) expect(named.has(u.key), u.key).toBe(true)
    })
  }
})

describe('D19 — suppression de compte = pseudonymisation effective', () => {
  it('nom et e-mail effacés, compte désactivé, connexion refusée, plus de compte de démo', async () => {
    const { s } = await session('emma')
    await s.privacy.requestDeletion('my_account')
    await expect(s.auth.login({ email: EMAILS.emma, password: 'demo' })).rejects.toBeDefined()
    await s.auth.login({ email: EMAILS.alice, password: 'demo' })
    const emma = (await s.users.listUsers()).find((u) => u.id === 'usr-emma')
    expect(emma?.active).toBe(false)
    expect(JSON.stringify(emma)).not.toMatch(/Emma|Janssens|emma\.collab/)
    expect(JSON.stringify(await s.auth.listDemoAccounts())).not.toContain('emma.collab')
  })
})

describe('nouveaux constats après corrections', () => {
  /**
   * QA-30 : rapprocher (manuellement ou en confirmant une suggestion) une facture « À vérifier »
   * — données extraites par l'IA, jamais validées — la passe à « payée » ; elle devient alors
   * non modifiable (D15) et non validable : des données IA non relues sont figées. Un manager,
   * qui n'a pas `invoices:write`, peut le faire.
   */
  it.fails(
    'QA-30 : une facture non validée (to_review / ai_extracted) ne peut pas devenir « payée » par un rapprochement',
    async () => {
      const { s } = await session('chloe')
      const tx = (await s.transactions.listMissingReceipts())[0]!
      await expect(
        s.reconciliations.createManualReconciliation('inv-010', tx.id),
      ).rejects.toBeDefined()
      expect((await s.invoices.getInvoice('inv-010')).status).toBe('to_review')
    },
  )

  /** QA-31 : le service accepte de rapprocher une facture avec une transaction de CRÉDIT. */
  it.fails('QA-31 : un rapprochement manuel avec un encaissement (crédit) est refusé', async () => {
    const { s } = await session('alice')
    const credit = (await s.transactions.listTransactions({ direction: 'credit', pageSize: 50 }))
      .items[0]!
    await expect(
      s.reconciliations.createManualReconciliation('inv-006', credit.id),
    ).rejects.toBeDefined()
    expect((await s.invoices.getInvoice('inv-006')).status).not.toBe('paid')
  })

  it('D14 : rejeter une suggestion ne change pas la facture ; confirmer la passe à « payée » à la date du paiement', async () => {
    const { s } = await session('alice')
    const [a, b] = await s.reconciliations.listReconciliations({ status: 'suggested' })
    const invA = await s.invoices.getInvoice(a!.invoiceId)
    await s.reconciliations.rejectReconciliation(a!.id, 'pas la bonne')
    expect((await s.invoices.getInvoice(a!.invoiceId)).status).toBe(invA.status)
    await s.reconciliations.confirmReconciliation(b!.id)
    const tx = await s.transactions.getTransaction(b!.transactionId)
    const paid = await s.invoices.getInvoice(b!.invoiceId)
    expect(paid.status).toBe('paid')
    expect(paid.paidAt).toBe(tx.bookingDate)
  })

  it('D16 : saisie manuelle sans consommer de tokens, même quand l’IA est indisponible', async () => {
    const { s } = await session('alice')
    const before = (await s.aiUsage.getUsageSummary()).totalTokens
    const { setErrorSimulation, clearErrorSimulation } = await import('@/core/errors')
    setErrorSimulation({ scenario: 'aiUnavailable', scope: 'ai', mode: 'always' })
    const inv = await s.invoices.createInvoice({
      entityId: 'ent-be',
      supplierId: 'sup-bureau',
      categoryId: null,
      number: 'QA-MAN-1',
      issueDate: '2026-11-20',
      dueDate: '2026-12-20',
      lines: [{ description: 'x', quantity: 2, unitPriceCents: 1_000, vatRateBp: 2100 }],
    })
    clearErrorSimulation()
    expect(inv.totalInclVatCents).toBe(2_420)
    expect(inv.provenance).toBe('validated')
    expect((await s.aiUsage.getUsageSummary()).totalTokens).toBe(before)
  })
})
