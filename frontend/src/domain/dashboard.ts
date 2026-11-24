import type { AiUsageSummary } from './ai'
import type { BudgetStatus } from './budget'
import type { Cents, DateRange, Id } from './common'
import type { SpendReport } from './spend'
import type { DueItem } from './subscription'

/**
 * Synthèse d'un tableau de bord (organisation ou entité). Les dépenses viennent de
 * `computeSpendReport` : mêmes chiffres que les écrans transactions / allocations / budgets.
 */
export interface DashboardSummary {
  period: DateRange
  /** `null` = vue consolidée organisation. */
  entityId: Id | null
  spend: SpendReport
  /** Factures non payées (« à payer ») : HORS total des dépenses. */
  toPayInvoiceCount: number
  toPayCents: Cents
  invoicesToReviewCount: number
  bankInflowsCents: Cents
  missingReceiptCount: number
  missingReceiptCents: Cents
  pendingReconciliationCount: number
  budgets: BudgetStatus[]
  upcomingDues: DueItem[]
  openInsightCount: number
  aiUsage: AiUsageSummary
}
