import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { getPlan } from '@/config/plans'
import { notFound } from '@/core/mock/mockRuntime'
import { monthRange, summarizeAiUsage } from '@/domain/finance'
import type { MockContext } from '../mock/context'
import { currentUser, paginate, requirePermission } from '../mock/access'
import type { AiUsageService } from './AiUsageService'

export function createMockAiUsageService(ctx: MockContext): AiUsageService {
  function orgRecords(operation: string) {
    const user = currentUser(ctx, operation)
    requirePermission(user, 'ai-usage:read', operation)
    const org = ctx.db.organizations.find((o) => o.id === user.organizationId)
    if (!org) throw notFound(operation, 'Organisation')
    return { org, records: ctx.db.aiUsage.filter((r) => r.organizationId === org.id) }
  }
  return {
    getUsageSummary: (query = {}) =>
      ctx.runtime.run('aiUsage.summary', () => {
        const { org, records } = orgRecords('aiUsage.summary')
        return summarizeAiUsage(
          records,
          monthRange(query.month ?? DEMO_CURRENT_MONTH),
          getPlan(org.planId).includedAiTokensPerMonth,
        )
      }),
    listUsage: (query = {}) =>
      ctx.runtime.run('aiUsage.list', () => {
        const { records } = orgRecords('aiUsage.list')
        const items = records
          .filter((r) => !query.from || r.date >= query.from)
          .filter((r) => !query.to || r.date <= query.to)
          .filter((r) => !query.feature || r.feature === query.feature)
          .filter((r) => !query.userId || r.userId === query.userId)
          .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
        return paginate(items, query)
      }),
  }
}
