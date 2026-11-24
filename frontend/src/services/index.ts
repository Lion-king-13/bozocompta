/**
 * REGISTRY DES SERVICES — le SEUL endroit où l'on choisit entre mock et http.
 *
 * Vues, composants et stores appellent `useServices()` et ne connaissent que les interfaces
 * (`InvoiceService`, `TransactionService`…). Le mode vient de `VITE_API_MODE` (src/config/env.ts).
 */
import { appConfig, type ApiMode, type AppConfig } from '@/config/env'
import { getAuthToken } from '@/core/http/authToken'
import { createHttpClient } from '@/core/http/httpClient'
import { createMockRuntime } from '@/core/mock/mockRuntime'

import type { AiInsightService } from './aiInsights/AiInsightService'
import type { AiUsageService } from './aiUsage/AiUsageService'
import type { AllocationService } from './allocations/AllocationService'
import type { AuthService } from './auth/AuthService'
import type { BudgetService } from './budgets/BudgetService'
import type { CardService } from './cards/CardService'
import type { CategoryService } from './categories/CategoryService'
import type { CostCenterService } from './costCenters/CostCenterService'
import type { DashboardService } from './dashboard/DashboardService'
import type { InvoiceService } from './invoices/InvoiceService'
import type { OrganizationService } from './organization/OrganizationService'
import type { PrivacyService } from './privacy/PrivacyService'
import type { ReconciliationService } from './reconciliations/ReconciliationService'
import type { SubscriptionService } from './subscriptions/SubscriptionService'
import type { SupplierService } from './suppliers/SupplierService'
import type { TransactionService } from './transactions/TransactionService'
import type { UserService } from './users/UserService'

import { createMockAiInsightService } from './aiInsights/mockAiInsightService'
import { createMockAiUsageService } from './aiUsage/mockAiUsageService'
import { createMockAllocationService } from './allocations/mockAllocationService'
import { createMockAuthService } from './auth/mockAuthService'
import { createMockBudgetService } from './budgets/mockBudgetService'
import { createMockCardService } from './cards/mockCardService'
import { createMockCategoryService } from './categories/mockCategoryService'
import { createMockCostCenterService } from './costCenters/mockCostCenterService'
import { createMockDashboardService } from './dashboard/mockDashboardService'
import { createMockInvoiceService } from './invoices/mockInvoiceService'
import { createMockContext } from './mock/context'
import { createMockOrganizationService } from './organization/mockOrganizationService'
import { createMockPrivacyService } from './privacy/mockPrivacyService'
import { createMockReconciliationService } from './reconciliations/mockReconciliationService'
import { createMockSubscriptionService } from './subscriptions/mockSubscriptionService'
import { createMockSupplierService } from './suppliers/mockSupplierService'
import { createMockTransactionService } from './transactions/mockTransactionService'
import { createMockUserService } from './users/mockUserService'

import { createHttpAiInsightService } from './aiInsights/httpAiInsightService'
import { createHttpAiUsageService } from './aiUsage/httpAiUsageService'
import { createHttpAllocationService } from './allocations/httpAllocationService'
import { createHttpAuthService } from './auth/httpAuthService'
import { createHttpBudgetService } from './budgets/httpBudgetService'
import { createHttpCardService } from './cards/httpCardService'
import { createHttpCategoryService } from './categories/httpCategoryService'
import { createHttpCostCenterService } from './costCenters/httpCostCenterService'
import { createHttpDashboardService } from './dashboard/httpDashboardService'
import { createHttpInvoiceService } from './invoices/httpInvoiceService'
import { createHttpOrganizationService } from './organization/httpOrganizationService'
import { createHttpPrivacyService } from './privacy/httpPrivacyService'
import { createHttpReconciliationService } from './reconciliations/httpReconciliationService'
import { createHttpSubscriptionService } from './subscriptions/httpSubscriptionService'
import { createHttpSupplierService } from './suppliers/httpSupplierService'
import { createHttpTransactionService } from './transactions/httpTransactionService'
import { createHttpUserService } from './users/httpUserService'

export interface Services {
  mode: ApiMode
  auth: AuthService
  organization: OrganizationService
  users: UserService
  suppliers: SupplierService
  categories: CategoryService
  invoices: InvoiceService
  transactions: TransactionService
  cards: CardService
  reconciliations: ReconciliationService
  costCenters: CostCenterService
  allocations: AllocationService
  budgets: BudgetService
  subscriptions: SubscriptionService
  aiInsights: AiInsightService
  aiUsage: AiUsageService
  privacy: PrivacyService
  dashboard: DashboardService
}

export function createMockServices(options: { latencyMs: number }): Services {
  const ctx = createMockContext(createMockRuntime({ latencyMs: options.latencyMs }))
  return {
    mode: 'mock',
    auth: createMockAuthService(ctx),
    organization: createMockOrganizationService(ctx),
    users: createMockUserService(ctx),
    suppliers: createMockSupplierService(ctx),
    categories: createMockCategoryService(ctx),
    invoices: createMockInvoiceService(ctx),
    transactions: createMockTransactionService(ctx),
    cards: createMockCardService(ctx),
    reconciliations: createMockReconciliationService(ctx),
    costCenters: createMockCostCenterService(ctx),
    allocations: createMockAllocationService(ctx),
    budgets: createMockBudgetService(ctx),
    subscriptions: createMockSubscriptionService(ctx),
    aiInsights: createMockAiInsightService(ctx),
    aiUsage: createMockAiUsageService(ctx),
    privacy: createMockPrivacyService(ctx),
    dashboard: createMockDashboardService(ctx),
  }
}

export function createHttpServices(options: { baseUrl: string; timeoutMs: number }): Services {
  const http = createHttpClient({ ...options, getToken: getAuthToken })
  return {
    mode: 'http',
    auth: createHttpAuthService(http),
    organization: createHttpOrganizationService(http),
    users: createHttpUserService(http),
    suppliers: createHttpSupplierService(http),
    categories: createHttpCategoryService(http),
    invoices: createHttpInvoiceService(http),
    transactions: createHttpTransactionService(http),
    cards: createHttpCardService(http),
    reconciliations: createHttpReconciliationService(http),
    costCenters: createHttpCostCenterService(http),
    allocations: createHttpAllocationService(http),
    budgets: createHttpBudgetService(http),
    subscriptions: createHttpSubscriptionService(http),
    aiInsights: createHttpAiInsightService(http),
    aiUsage: createHttpAiUsageService(http),
    privacy: createHttpPrivacyService(http),
    dashboard: createHttpDashboardService(http),
  }
}

export function createServices(config: AppConfig): Services {
  return config.apiMode === 'http'
    ? createHttpServices({ baseUrl: config.apiBaseUrl, timeoutMs: config.apiTimeoutMs })
    : createMockServices({ latencyMs: config.mockLatencyMs })
}

let current: Services | null = null

/** Point d'accès unique aux services pour les vues et les stores. */
export function useServices(): Services {
  if (!current) current = createServices(appConfig)
  return current
}

/** Tests : remplacer les services (ex. `createMockServices({ latencyMs: 0 })`), ou `null` pour réinitialiser. */
export function setServices(services: Services | null): void {
  current = services
}

export type {
  AiInsightService,
  AiUsageService,
  AllocationService,
  AuthService,
  BudgetService,
  CardService,
  CategoryService,
  CostCenterService,
  DashboardService,
  InvoiceService,
  OrganizationService,
  PrivacyService,
  ReconciliationService,
  SubscriptionService,
  SupplierService,
  TransactionService,
  UserService,
}
export type { UploadedFile } from './invoices/InvoiceService'
export type { DemoAccount, SignUpInput } from './auth/AuthService'
