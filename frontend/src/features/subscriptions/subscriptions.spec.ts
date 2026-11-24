import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '@/config/demo'
import { addDays } from '@/core/dates/dates'
import type { DueItem } from '@/domain'
import { computeDueItems } from '@/domain/finance'
import type { Services } from '@/services'
import { createTestServices, loginAs } from '@/test/helpers'
import { annualCostCents, dueBadge, groupDueItems } from './subscriptionModel'

const due = (dueDate: string, overdue = false): DueItem => ({
  kind: 'invoice_due',
  sourceId: dueDate,
  entityId: 'ent-be',
  label: 'Facture',
  dueDate,
  amountCents: 1_000,
  overdue,
})

describe('coût annualisé', () => {
  it('multiplie par le nombre de renouvellements par an', () => {
    expect(annualCostCents({ amountCents: 17_545, frequency: 'monthly' })).toBe(210_540)
    expect(annualCostCents({ amountCents: 30_000, frequency: 'quarterly' })).toBe(120_000)
    expect(annualCostCents({ amountCents: 96_000, frequency: 'yearly' })).toBe(96_000)
  })
})

describe('échéances relatives à la date de démo (20/11/2026)', () => {
  it('regroupe en retard / 7 prochains jours / plus tard', () => {
    const groups = groupDueItems([
      due('2026-11-19', true),
      due('2026-11-20'),
      due('2026-11-27'),
      due('2026-11-28'),
    ])
    expect(groups.map((g) => [g.id, g.items.map((i) => i.dueDate)])).toEqual([
      ['overdue', ['2026-11-19']],
      ['soon', ['2026-11-20', '2026-11-27']],
      ['later', ['2026-11-28']],
    ])
  })

  it('écrit le délai en clair', () => {
    expect(dueBadge(due('2026-11-17', true))).toMatchObject({
      tone: 'danger',
      label: 'En retard de 3 j',
    })
    expect(dueBadge(due(DEMO_TODAY))).toMatchObject({ tone: 'warning', label: "Aujourd'hui" })
    expect(dueBadge(due('2026-11-27'))).toMatchObject({ tone: 'warning', label: 'Dans 7 j' })
    expect(dueBadge(due('2026-12-01'))).toMatchObject({ tone: 'neutral', label: 'Dans 11 j' })
  })

  it('computeDueItems : renouvellements dans l’horizon, abonnements résiliés ignorés', () => {
    const range = { start: DEMO_TODAY, end: addDays(DEMO_TODAY, 30) }
    const sub = {
      id: 's',
      entityId: 'ent-be',
      supplierId: 'x',
      categoryId: null,
      costCenterId: null,
      cardId: null,
      name: 'Outil',
      amountCents: 1_000,
      frequency: 'monthly' as const,
      startDate: '2026-01-05',
      nextRenewalDate: '2026-11-25',
      status: 'active' as const,
    }
    const items = computeDueItems(
      [sub, { ...sub, id: 'c', status: 'cancelled' }],
      [],
      range,
      DEMO_TODAY,
    )
    // 25/11 dans l'horizon ; 25/12 au-delà du 20/12 ; l'abonnement résilié est ignoré.
    expect(items.map((i) => i.dueDate)).toEqual(['2026-11-25'])
    expect(items.every((i) => i.sourceId === 's' && !i.overdue)).toBe(true)
  })
})

describe('service abonnements (mock)', () => {
  let services: Services
  beforeEach(async () => {
    services = createTestServices()
    await loginAs(services, 'alice')
  })

  it('les échéances par défaut couvrent 30 jours à partir de DEMO_TODAY, retards inclus', async () => {
    const items = await services.subscriptions.listDueItems()
    const limit = addDays(DEMO_TODAY, 30)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.dueDate <= limit)).toBe(true)
    expect(items.filter((i) => i.dueDate < DEMO_TODAY).every((i) => i.overdue)).toBe(true)
    expect(items.some((i) => i.overdue)).toBe(true)
  })

  it('les abonnements DataViz et ChartBoard sont signalés redondants par une suggestion IA', async () => {
    const [insight] = await services.aiInsights.listInsights({ type: 'redundant_subscription' })
    expect(insight?.relatedSubscriptionIds).toEqual(['sub-dataviz', 'sub-chartboard'])
    expect(insight?.status).toBe('open')
  })
})
