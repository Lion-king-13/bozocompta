import { beforeEach, describe, expect, it } from 'vitest'
import { sumCents } from '@/core/money'
import type { DashboardSummary } from '@/domain'
import type { Services } from '@/services'
import { createTestServices, loginAs, type EMAILS } from '@/test/helpers'
import { ACTION_COUNTERS } from './actionCounters'
import {
  entityBars,
  entityShare,
  monthlyPoints,
  spendBreakdowns,
  type ChartLabels,
} from './dashboardCharts'
import { monthsInRange, periodFromQuery, presetRange } from './period'

let services: Services

const LABELS: ChartLabels = {
  entity: (id) => `E:${id}`,
  category: (id) => `C:${id}`,
  costCenter: (id) => `CC:${id}`,
  user: (id) => `U:${id}`,
  card: (id) => `K:${id}`,
  entitySlot: (id) => (id === 'ent-be' ? 1 : 2),
}
const SEPTEMBER = { start: '2026-09-01', end: '2026-09-30' }
const YTD = presetRange('annee')
const total = (items: { value: number }[]) => sumCents(items.map((i) => i.value))
const amount = (s: DashboardSummary['spend']['imputedByEntity'], id: string) =>
  s.find((i) => i.key === id)?.amountCents ?? 0

beforeEach(() => {
  services = createTestServices()
})

describe('périodes relatives à la date de démo (20/11/2026)', () => {
  it('calcule mois, trimestre et année à date', () => {
    expect(presetRange('mois')).toEqual({ start: '2026-11-01', end: '2026-11-20' })
    expect(presetRange('trimestre')).toEqual({ start: '2026-10-01', end: '2026-11-20' })
    expect(presetRange('annee')).toEqual({ start: '2026-01-01', end: '2026-11-20' })
    expect(presetRange('trimestre', '2026-03-31')).toEqual({
      start: '2026-01-01',
      end: '2026-03-31',
    })
  })

  it('lit la période de l’URL et refuse une période invalide', () => {
    expect(periodFromQuery({}).preset).toBe('annee')
    expect(periodFromQuery({ periode: 'perso', du: '2026-09-01', au: '2026-09-30' }).range).toEqual(
      SEPTEMBER,
    )
    expect(periodFromQuery({ periode: 'perso', du: '2026-10-01', au: '2026-09-01' }).preset).toBe(
      'annee',
    )
    expect(periodFromQuery({ periode: 'perso', du: 'n/a', au: '2026-09-01' }).preset).toBe('annee')
  })

  it('liste les mois de la période', () => {
    expect(monthsInRange({ start: '2026-09-15', end: '2026-11-20' })).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
    ])
  })
})

describe('cohérence tableau de bord ↔ calcul unique des dépenses', () => {
  beforeEach(() => loginAs(services, 'alice'))

  it('exemple obligatoire : 3 000 € comptés une fois, Belgique 1 800 / 3 000, France 1 200 / 0', async () => {
    const org = await services.dashboard.getSummary({ period: SEPTEMBER })
    const be = await services.dashboard.getSummary({ period: SEPTEMBER, entityId: 'ent-be' })
    const fr = await services.dashboard.getSummary({ period: SEPTEMBER, entityId: 'ent-fr' })
    expect(org.spend.imputedTotalCents).toBe(300_000)
    expect(org.spend.transactionCount).toBe(1)
    expect([be.spend.imputedTotalCents, be.spend.paidTotalCents]).toEqual([180_000, 300_000])
    expect([fr.spend.imputedTotalCents, fr.spend.paidTotalCents]).toEqual([120_000, 0])
    expect(be.spend.imputedTotalCents + fr.spend.imputedTotalCents).toBe(
      org.spend.imputedTotalCents,
    )

    // Les barres du graphique « par entité » reprennent exactement ces montants.
    const bars = entityBars(org.spend, ['ent-be', 'ent-fr'], LABELS)
    expect(bars.map((b) => [b.key, b.value])).toEqual([
      ['ent-be-imputed', 180_000],
      ['ent-be-paid', 300_000],
      ['ent-fr-imputed', 120_000],
      ['ent-fr-paid', 0],
    ])
    expect(total(entityShare(org.spend, LABELS))).toBe(300_000)
  })

  it('chaque graphique somme au total de l’organisation (année à date)', async () => {
    const org = await services.dashboard.getSummary({ period: YTD })
    const t = org.spend.imputedTotalCents
    expect(t).toBeGreaterThan(0)
    expect(org.spend.paidTotalCents).toBe(t)
    expect(sumCents(org.spend.imputedByEntity.map((i) => i.amountCents))).toBe(t)
    expect(sumCents(org.spend.paidByEntity.map((i) => i.amountCents))).toBe(t)
    const charts = spendBreakdowns(org.spend, LABELS)
    expect(total(charts.byCategory)).toBe(t)
    expect(total(charts.byCostCenter)).toBe(t)
    expect(total(charts.byUser)).toBe(t)
    expect(total(charts.byCard)).toBe(t)
    expect(total(monthlyPoints(org.spend, YTD))).toBe(t)
    expect(monthlyPoints(org.spend, YTD)).toHaveLength(11)
  })

  it('Σ imputé des tableaux de bord entité = Σ payé = total organisation', async () => {
    const org = await services.dashboard.getSummary({ period: YTD })
    const perEntity = await Promise.all(
      ['ent-be', 'ent-fr'].map((entityId) =>
        services.dashboard.getSummary({ period: YTD, entityId }),
      ),
    )
    const imputed = sumCents(perEntity.map((s) => s.spend.imputedTotalCents))
    const paid = sumCents(perEntity.map((s) => s.spend.paidTotalCents))
    expect(imputed).toBe(org.spend.imputedTotalCents)
    expect(paid).toBe(org.spend.imputedTotalCents)
    for (const s of perEntity) {
      expect(amount(org.spend.imputedByEntity, s.entityId!)).toBe(s.spend.imputedTotalCents)
      // Dans un tableau de bord entité, toutes les ventilations somment à l'imputé.
      const charts = spendBreakdowns(s.spend, LABELS)
      expect(total(charts.byCategory)).toBe(s.spend.imputedTotalCents)
      expect(total(charts.byCostCenter)).toBe(s.spend.imputedTotalCents)
    }
  })
})

describe('compteurs « À traiter » = longueur des listes ciblées', () => {
  const lists = async (entityId: string | null) => {
    const scope = entityId ? { entityId } : {}
    return {
      invoices: (
        await services.invoices.listInvoices({ status: 'to_review', pageSize: 200, ...scope })
      ).items.length,
      reconciliations: (
        await services.reconciliations.listReconciliations({ status: 'suggested', ...scope })
      ).length,
      missing: (await services.transactions.listMissingReceipts(scope)).length,
      insights: (await services.aiInsights.listInsights({ status: 'open', ...scope })).length,
    }
  }

  const who: (keyof typeof EMAILS)[] = ['alice', 'bruno', 'chloe', 'david']
  for (const user of who) {
    it(`pour ${user}, organisation et chaque entité accessible`, async () => {
      await loginAs(services, user)
      const entities = await services.organization.listEntities()
      for (const entityId of [null, ...entities.map((e) => e.id)]) {
        const expected = await lists(entityId)
        for (const def of ACTION_COUNTERS) {
          expect(await def.count(services, entityId), `${def.id} / ${entityId}`).toBe(
            expected[def.id],
          )
        }
      }
    })
  }

  it('les budgets et échéances de la synthèse sont ceux des écrans Budgets et Abonnements', async () => {
    await loginAs(services, 'alice')
    for (const entityId of [undefined, 'ent-be', 'ent-fr']) {
      const summary = await services.dashboard.getSummary({ entityId })
      const budgets = await services.budgets.listBudgetStatuses({ entityId })
      const dues = await services.subscriptions.listDueItems({ entityId })
      expect(summary.budgets).toEqual(budgets)
      expect(summary.upcomingDues).toEqual(dues)
    }
  })

  it('données de démo : 3 rapprochements en attente, 5 suggestions IA ouvertes', async () => {
    await loginAs(services, 'alice')
    const counts = await Promise.all(ACTION_COUNTERS.map((d) => d.count(services, null)))
    expect(counts.every((c) => c >= 0)).toBe(true)
    const byId = Object.fromEntries(ACTION_COUNTERS.map((d, i) => [d.id, counts[i]]))
    expect(byId.reconciliations).toBe(3)
    expect(byId.insights).toBe(5)
  })
})
