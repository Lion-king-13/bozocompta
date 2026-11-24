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
import { hasPermission } from '@/domain'
import type { MockContext } from '../mock/context'
import {
  accessibleEntityIds,
  assertEntityAccess,
  canSeeHolder,
  cardHolderId,
  currentUser,
  hasFullAccess,
  invoiceConcernsEntity,
  isInvoiceVisible,
  isTransactionVisible,
  requirePermission,
  transactionConcernsEntity,
} from '../mock/access'
import type { DashboardService } from './DashboardService'

const UNPAID = ['to_review', 'approved', 'disputed']

/**
 * Le mock assemble la synthèse avec les MÊMES fonctions de calcul et les MÊMES règles de
 * visibilité que les listes : les chiffres se recoupent par construction.
 * - dépenses : `computeSpendReport` ; utilisateur limité → seules les parts imputées à ses
 *   entités (QA-03) ; dépenses nominatives masquées hors de son périmètre (QA-20) ;
 * - compteurs (QA-04) : mêmes filtres que `listMissingReceipts`, `listReconciliations`,
 *   `listInvoices` (entité = payée par OU imputée à) ; 0 si la liste lui est interdite.
 */
export function createMockDashboardService(ctx: MockContext): DashboardService {
  return {
    getSummary: (query = {}) =>
      ctx.runtime.run('dashboard.summary', () => {
        const op = 'dashboard.summary'
        const user = currentUser(ctx, op)
        requirePermission(user, 'dashboard:read', op)
        const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(user.role, p)
        const entityId = query.entityId ?? null
        if (entityId) assertEntityAccess(ctx, user, entityId, op)
        const period = query.period ?? {
          start: `${DEMO_TODAY.slice(0, 4)}-01-01`,
          end: DEMO_TODAY,
        }
        const org = ctx.db.organizations.find((o) => o.id === user.organizationId)
        if (!org) throw notFound(op, 'Organisation')
        const entities = accessibleEntityIds(ctx, user)
        const inScope = (id: string) => (entityId ? id === entityId : entities.has(id))

        // ---- Dépenses (calcul unique)
        const visibleTx = ctx.db.transactions.filter((t) => isTransactionVisible(ctx, user, t))
        // Dépense nominative d'un porteur hors périmètre : comptée, mais sans carte ni nom.
        const spendTx = visibleTx.map((t) => {
          const holder = cardHolderId(ctx, t)
          return holder && !canSeeHolder(ctx, user, holder) ? { ...t, cardId: null } : t
        })
        const spend = computeSpendReport(
          { ...ctx.db, transactions: spendTx },
          { period, entityId, restrictToEntityIds: hasFullAccess(user) ? undefined : entities },
        )

        // ---- Compteurs : mêmes règles que les listes
        const concerns = (t: (typeof visibleTx)[number]) =>
          entityId ? transactionConcernsEntity(ctx, t, entityId) : true
        const listedTx = can('transactions:read') ? visibleTx.filter(concerns) : []
        const missing = listedTx.filter(
          (t) =>
            t.direction === 'debit' &&
            transactionReconciliationStatus(t.id, ctx.db.reconciliations) !== 'matched',
        )
        const visibleTxIds = new Set(listedTx.map((t) => t.id))
        const pending = can('reconciliations:read')
          ? ctx.db.reconciliations.filter(
              (r) => r.status === 'suggested' && visibleTxIds.has(r.transactionId),
            )
          : []
        const invoices = can('invoices:read')
          ? ctx.db.invoices.filter(
              (i) =>
                isInvoiceVisible(ctx, user, i) &&
                (!entityId || invoiceConcernsEntity(ctx, i, entityId)),
            )
          : []
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
            listedTx
              .filter(
                (t) =>
                  t.direction === 'credit' &&
                  inScope(t.entityId) &&
                  t.bookingDate >= period.start &&
                  t.bookingDate <= period.end,
              )
              .map((t) => t.amountCents),
          ),
          missingReceiptCount: missing.length,
          missingReceiptCents: sumCents(missing.map((t) => t.amountCents)),
          pendingReconciliationCount: pending.length,
          budgets: can('budgets:read')
            ? ctx.db.budgets
                .filter((b) => b.month === DEMO_CURRENT_MONTH && inScope(b.entityId))
                .map((b) => computeBudgetStatus(b, budgetLines))
            : [],
          upcomingDues: can('subscriptions:read')
            ? computeDueItems(
                ctx.db.subscriptions,
                ctx.db.invoices,
                { start: DEMO_TODAY, end: addDays(DEMO_TODAY, 30) },
                DEMO_TODAY,
              ).filter((d) => inScope(d.entityId))
            : [],
          openInsightCount: can('ai-insights:read')
            ? ctx.db.aiInsights.filter(
                (i) =>
                  i.organizationId === org.id &&
                  i.status === 'open' &&
                  (i.entityId === null ? !entityId : inScope(i.entityId)),
              ).length
            : 0,
          aiUsage: summarizeAiUsage(
            ctx.db.aiUsage.filter((r) => r.organizationId === org.id),
            monthRange(DEMO_CURRENT_MONTH),
            getPlan(org.planId).includedAiTokensPerMonth,
          ),
        }
      }),
  }
}
