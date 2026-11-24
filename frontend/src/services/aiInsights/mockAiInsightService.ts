import { conflict, notFound } from '@/core/mock/mockRuntime'
import type { AiInsight } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  requirePermission,
} from '../mock/access'
import { assertAiQuota, recordAiUsage } from '../mock/aiQuota'
import type { AiInsightService } from './AiInsightService'

const ANALYSIS_TOKENS = 8_000

export function createMockAiInsightService(ctx: MockContext): AiInsightService {
  function visible(operation: string): AiInsight[] {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'ai-insights:read', operation)
    const entities = accessibleEntityIds(ctx, user)
    return ctx.db.aiInsights.filter(
      (i) =>
        i.organizationId === user.organizationId &&
        (i.entityId === null || entities.has(i.entityId)),
    )
  }

  function decide(id: string, status: 'dismissed' | 'resolved', operation: string): AiInsight {
    const user = currentUser(ctx, operation)
    const insight = visible(operation).find((i) => i.id === id)
    if (!insight) throw notFound(operation, 'Analyse')
    if (insight.status !== 'open') throw conflict(operation, 'Cette suggestion a déjà été traitée.')
    const target = ctx.db.aiInsights.find((i) => i.id === id) as AiInsight
    Object.assign(target, { status, decidedAt: ctx.now(), decidedByUserId: user.id })
    return target
  }

  return {
    listInsights: (query = {}) =>
      ctx.runtime.run('insights.list', () => {
        const user = currentUser(ctx, 'insights.list')
        if (query.entityId) assertEntityAccess(ctx, user, query.entityId, 'insights.list')
        return visible('insights.list')
          .filter((i) => !query.type || i.type === query.type)
          .filter((i) => !query.status || i.status === query.status)
          .filter((i) => !query.entityId || i.entityId === query.entityId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),
    runAnalysis: () =>
      ctx.runtime.run('ai.analyze', () => {
        const user = currentUser(ctx, 'ai.analyze')
        assertAiQuota(ctx, user, ANALYSIS_TOKENS, 'ai.analyze')
        // Simulation déterministe : l'analyse « retrouve » les suggestions ouvertes existantes.
        const result = visible('ai.analyze').filter((i) => i.status === 'open')
        recordAiUsage(ctx, user, 'insight_generation', ANALYSIS_TOKENS)
        return result
      }),
    dismissInsight: (id) =>
      ctx.runtime.run('insights.dismiss', () => decide(id, 'dismissed', 'insights.dismiss')),
    resolveInsight: (id) =>
      ctx.runtime.run('insights.resolve', () => decide(id, 'resolved', 'insights.resolve')),
  }
}
