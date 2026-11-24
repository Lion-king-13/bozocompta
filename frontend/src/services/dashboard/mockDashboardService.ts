import { DEMO_CURRENT_MONTH, DEMO_TODAY } from '@/config/demo'
import { getPlan } from '@/config/plans'
import { addDays } from '@/core/dates/dates'
import { notFound } from '@/core/mock/mockRuntime'
import { sumCents } from '@/core/money'
import {
  computeBudgetStatus,
  computeDueItems,
  computeImputedLines,
  computeSpendReport,
  monthRange,
  summarizeAiUsage,
  transactionReconciliationStatus,
} from '@/domain/finance'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  currentUser,
  isInvoiceVisible,
  isTransactionVisible,
  requirePermission,
} from '../mock/access'
import type { DashboardService } from './DashboardService'

const UNPAID = ['to_review', 'approved', 'disputed']

/**
 * Le mock assemble la synthèse avec les MÊMES fonctions de calcul que les écrans
 * (computeSpendReport, computeBudgetStatus…) : les chiffres se recoupent par construction.
 */
export function createMockDashboardService(ctx: MockContext): DashboardService {
  return {
    getSummary: (query = {}) =>
      ctx.runtime.run('dashboard.summary', () => {
        const op = 'dashboard.summary'
        const user = currentUser(ctx, op)
        requirePermission(user, 'dashboard:read', op)
        const entityId = query.entityId ?? null
        if (entityId) assertEntityAccess(ctx, user, entityId, op)
        const period = query.period ?? { start: `${DEMO_TODAY.slice(0, 4)}-01-01`, end: DEMO_TODAY }
        const org = ctx.db.organizations.find((o) => o.id === user.organizationId)
        if (!org) throw notFound(op, 'Organisation')
        const entities = accessibleEntityIds(ctx, user)
        const inScope = (id: string) => (entityId ? id === entityId : entities.has(id))

        const transactions = ctx.db.transactions.filter((t) => isTransactionVisible(ctx, user, t))
        const spend = computeSpendReport({ ...ctx.db, transactions }, { period, entityId })
        const views = transactions
          .filter((t) => inScope(t.entityId))
          .map((t) => ({
            t,
            status: transactionReconciliationStatus(t.id, ctx.db.reconciliations),
          }))
        const missing = views.filter(
          ({ t, status }) => t.direction === 'debit' && status !== 'matched',
        )
        const invoices = ctx.db.invoices.filter(
          (i) => isInvoiceVisible(ctx, user, i) && inScope(i.entityId),
        )
        const toPay = invoices.filter((i) => UNPAID.includes(i.status))
        const budgetLines = computeImputedLines(ctx.db, monthRange(DEMO_CURRENT_MONTH))

        return {
          period,
          entityId,
          spend,
          toPayInvoiceCount: toPay.length,
          toPayCents: sumCents(toPay.map((i) => i.totalInclVatCents)),
          invoicesToReviewCount: invoices.filter((i) => i.status === 'to_review').length,
          bankInflowsCents: sumCents(
            views
              .filter(
                ({ t }) =>
                  t.direction === 'credit' &&
                  t.bookingDate >= period.start &&
                  t.bookingDate <= period.end,
              )
              .map(({ t }) => t.amountCents),
          ),
          missingReceiptCount: missing.length,
          missingReceiptCents: sumCents(missing.map(({ t }) => t.amountCents)),
          pendingReconciliationCount: views.filter(({ status }) => status === 'suggested').length,
          budgets: ctx.db.budgets
            .filter((b) => b.month === DEMO_CURRENT_MONTH && inScope(b.entityId))
            .map((b) => computeBudgetStatus(b, budgetLines)),
          upcomingDues: computeDueItems(
            ctx.db.subscriptions,
            ctx.db.invoices,
            { start: DEMO_TODAY, end: addDays(DEMO_TODAY, 30) },
            DEMO_TODAY,
          ).filter((d) => inScope(d.entityId)),
          openInsightCount: ctx.db.aiInsights.filter(
            (i) =>
              i.organizationId === org.id &&
              i.status === 'open' &&
              (i.entityId === null ? !entityId : inScope(i.entityId)),
          ).length,
          aiUsage: summarizeAiUsage(
            ctx.db.aiUsage.filter((r) => r.organizationId === org.id),
            monthRange(DEMO_CURRENT_MONTH),
            getPlan(org.planId).includedAiTokensPerMonth,
          ),
        }
      }),
  }
}
