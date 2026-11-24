/**
 * JEU DE DONNÉES MOCK UNIQUE, cohérent et déterministe, partagé par tous les services mock.
 * - Dates fixes ; « aujourd'hui » vaut `DEMO_TODAY` (src/config/demo.ts) dans toute la démo.
 * - Aucune donnée réelle (noms, numéros, IBAN, e-mails `.test` : tout est inventé).
 * - Interdit d'import depuis les vues / stores (règle ESLint) : passer par `useServices()`.
 */
import type {
  AiInsight,
  AiUsageRecord,
  Allocation,
  BankAccount,
  BankTransaction,
  Budget,
  Card,
  Category,
  CostCenter,
  DataExport,
  DeletionRequest,
  ImportBatch,
  Invoice,
  InvoiceDraft,
  LegalEntity,
  Organization,
  Reconciliation,
  RecurringSubscription,
  Supplier,
  User,
} from '@/domain'
import { AI_INSIGHTS, AI_USAGE } from './ai'
import { ALLOCATIONS, BANK_ACCOUNTS, CARDS, IMPORT_BATCHES, RECONCILIATIONS, TRANSACTIONS } from './banking'
import { ENTITIES, ORGANIZATION, USERS } from './organization'
import { BUDGETS, SUBSCRIPTIONS } from './planning'
import { CATEGORIES, COST_CENTERS, INVOICES, SUPPLIERS } from './purchasing'

export { DEMO_PASSWORD } from './organization'


export interface Dataset {
  organizations: Organization[]
  entities: LegalEntity[]
  users: User[]
  suppliers: Supplier[]
  categories: Category[]
  costCenters: CostCenter[]
  invoices: Invoice[]
  invoiceDrafts: InvoiceDraft[]
  allocations: Allocation[]
  bankAccounts: BankAccount[]
  importBatches: ImportBatch[]
  transactions: BankTransaction[]
  cards: Card[]
  reconciliations: Reconciliation[]
  budgets: Budget[]
  subscriptions: RecurringSubscription[]
  aiInsights: AiInsight[]
  aiUsage: AiUsageRecord[]
  dataExports: DataExport[]
  deletionRequests: DeletionRequest[]
}

export const SEED: Readonly<Dataset> = Object.freeze({
  organizations: [ORGANIZATION],
  entities: ENTITIES,
  users: USERS,
  suppliers: SUPPLIERS,
  categories: CATEGORIES,
  costCenters: COST_CENTERS,
  invoices: INVOICES,
  invoiceDrafts: [],
  allocations: ALLOCATIONS,
  bankAccounts: BANK_ACCOUNTS,
  importBatches: IMPORT_BATCHES,
  transactions: TRANSACTIONS,
  cards: CARDS,
  reconciliations: RECONCILIATIONS,
  budgets: BUDGETS,
  subscriptions: SUBSCRIPTIONS,
  aiInsights: AI_INSIGHTS,
  aiUsage: AI_USAGE,
  dataExports: [],
  deletionRequests: [],
})

/** Copie modifiable du jeu de données (une par instance de services mock). */
export function createMockDb(): Dataset {
  return structuredClone(SEED) as Dataset
}
