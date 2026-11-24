import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { getPlan } from '@/config/plans'
import type { AiUsageRecord } from '@/domain'
import { monthRange, summarizeAiUsage } from '@/domain/finance'
import type { Services } from '@/services'
import { createTestServices, loginAs } from '@/test/helpers'
import { formatTokens, usageByDay, usageByMonth, usageTotals } from './usageStats'

const rec = (
  date: string,
  inputTokens: number,
  outputTokens: number,
  costCents = 1,
): AiUsageRecord => ({
  id: `${date}-${inputTokens}`,
  organizationId: 'org',
  userId: 'u',
  feature: 'invoice_extraction',
  date,
  inputTokens,
  outputTokens,
  costCents,
})

describe('résumé de consommation IA et quota', () => {
  const NOV = monthRange('2026-11')

  it('additionne les tokens et coûts du mois uniquement', () => {
    const records = [
      rec('2026-10-31', 999, 1),
      rec('2026-11-01', 800, 200, 2),
      rec('2026-11-20', 400, 100, 1),
    ]
    const s = summarizeAiUsage(records, NOV, 10_000)
    expect([s.totalTokens, s.totalCostCents, s.quotaUsedBp, s.quotaExceeded]).toEqual([
      1_500,
      3,
      1_500,
      false,
    ])
    const t = usageTotals(records.slice(1))
    expect([t.inputTokens, t.outputTokens, t.totalTokens]).toEqual([1_200, 300, s.totalTokens])
  })

  it('signale le dépassement de quota à 100 % et au-delà', () => {
    expect(summarizeAiUsage([rec('2026-11-02', 800, 200)], NOV, 1_000)).toMatchObject({
      quotaUsedBp: 10_000,
      quotaExceeded: true,
    })
    expect(summarizeAiUsage([rec('2026-11-02', 1_000, 200)], NOV, 1_000)).toMatchObject({
      quotaUsedBp: 12_000,
      quotaExceeded: true,
    })
    expect(summarizeAiUsage([rec('2026-11-02', 700, 99)], NOV, 1_000).quotaExceeded).toBe(false)
  })

  it('ventile par jour (jours vides à 0) et par mois', () => {
    const records = [rec('2026-11-01', 10, 0), rec('2026-11-03', 5, 5), rec('2026-10-15', 1, 1)]
    const days = usageByDay(records, { start: '2026-11-01', end: '2026-11-03' })
    expect(days.map((d) => d.totalTokens)).toEqual([10, 0, 10])
    expect(usageByMonth(records).map((m) => [m.key, m.totalTokens])).toEqual([
      ['2026-10', 2],
      ['2026-11', 20],
    ])
  })

  it('formate les tokens avec séparateur de milliers', () => {
    expect(formatTokens(12_480).replace(/\s/g, ' ')).toBe('12 480 tokens')
  })
})

describe('service de consommation IA (mock)', () => {
  let services: Services
  beforeEach(async () => {
    services = createTestServices()
    await loginAs(services, 'alice')
  })

  it('le quota affiché est celui de l’offre de l’organisation (config/plans.ts)', async () => {
    const s = await services.aiUsage.getUsageSummary()
    expect(s.includedTokens).toBe(getPlan('plan-pro').includedAiTokensPerMonth)
    expect(s.quotaExceeded).toBe(false)
    const records = await services.aiUsage.listUsage({
      from: monthRange(DEMO_CURRENT_MONTH).start,
      to: monthRange(DEMO_CURRENT_MONTH).end,
      pageSize: 200,
    })
    expect(records.total).toBeLessThanOrEqual(200)
    expect(usageTotals(records.items).totalTokens).toBe(s.totalTokens)
    expect(s.byFeature.reduce((a, f) => a + f.tokens, 0)).toBe(s.totalTokens)
  })

  it('est réservée aux rôles autorisés (admin, finance)', async () => {
    await loginAs(services, 'chloe')
    await expect(services.aiUsage.getUsageSummary()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
