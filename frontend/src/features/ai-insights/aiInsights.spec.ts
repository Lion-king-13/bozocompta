import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApiError, clearErrorSimulation, setErrorSimulation } from '@/core/errors'
import type { Services } from '@/services'
import { createTestServices, loginAs } from '@/test/helpers'
import { analysisErrorMessage, countByType } from './insightModel'

let services: Services

const tokensThisMonth = async () => (await services.aiUsage.getUsageSummary()).totalTokens

beforeEach(async () => {
  services = createTestServices()
  await loginAs(services, 'alice')
})
afterEach(() => clearErrorSimulation())

describe('analyses IA : l’IA propose, l’humain décide', () => {
  it('compte les suggestions par type (5 types)', async () => {
    const counts = countByType(await services.aiInsights.listInsights())
    expect(counts).toEqual({
      anomaly: 2,
      duplicate: 1,
      price_increase: 1,
      redundant_subscription: 1,
      optimization: 1,
    })
  })

  it('« Lancer une analyse » (simulée) consomme du quota et ne décide rien', async () => {
    const before = await tokensThisMonth()
    const openBefore = await services.aiInsights.listInsights({ status: 'open' })
    const result = await services.aiInsights.runAnalysis()
    expect(await tokensThisMonth()).toBeGreaterThan(before)
    expect(result.map((i) => i.id).sort()).toEqual(openBefore.map((i) => i.id).sort())
    expect(result.every((i) => i.status === 'open')).toBe(true)
  })

  it('échoue avec « IA indisponible » ou « quota dépassé » sans consommer de quota', async () => {
    const before = await tokensThisMonth()
    for (const [scenario, code] of [
      ['aiUnavailable', 'AI_UNAVAILABLE'],
      ['aiQuotaExceeded', 'AI_QUOTA_EXCEEDED'],
    ] as const) {
      setErrorSimulation({ scenario, scope: 'ai', mode: 'always' })
      const error = await services.aiInsights.runAnalysis().catch((e: ApiError) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).code).toBe(code)
      // La consultation des suggestions enregistrées reste possible.
      expect((await services.aiInsights.listInsights()).length).toBe(6)
      clearErrorSimulation()
    }
    expect(await tokensThisMonth()).toBe(before)
  })

  it('accepter / ignorer est tracé (qui, quand) et une décision est définitive', async () => {
    const accepted = await services.aiInsights.resolveInsight('ins-002')
    expect(accepted).toMatchObject({ status: 'resolved', decidedByUserId: 'usr-alice' })
    expect(accepted.decidedAt).toBeTruthy()
    const ignored = await services.aiInsights.dismissInsight('ins-003')
    expect(ignored).toMatchObject({ status: 'dismissed', decidedByUserId: 'usr-alice' })
    await expect(services.aiInsights.dismissInsight('ins-002')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('accepter une suggestion ne modifie aucun montant du tableau de bord', async () => {
    const before = await services.dashboard.getSummary()
    await services.aiInsights.resolveInsight('ins-004')
    const after = await services.dashboard.getSummary()
    expect(after.spend).toEqual(before.spend)
  })

  it('fournit un message clair pour chaque erreur IA', () => {
    const err = (code: 'AI_UNAVAILABLE' | 'AI_QUOTA_EXCEEDED') =>
      new ApiError({ code, status: 503, message: 'x' })
    expect(analysisErrorMessage(err('AI_UNAVAILABLE')).title).toBe('Service IA indisponible')
    expect(analysisErrorMessage(err('AI_QUOTA_EXCEEDED')).title).toBe('Quota IA dépassé')
  })
})
