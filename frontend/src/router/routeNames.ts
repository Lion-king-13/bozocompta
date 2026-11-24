/**
 * Noms de routes : toujours naviguer par NOM (`{ name: RouteName.Invoices }`), jamais par URL
 * en dur. Toutes les routes sont déjà déclarées : un agent qui remplit une vue n'a pas besoin
 * de modifier ce fichier.
 */
export const RouteName = {
  // Public
  Landing: 'landing',
  Login: 'login',
  SignUp: 'signup',
  PublicPrivacy: 'privacy-public',
  Forbidden: 'forbidden',
  NotFound: 'not-found',
  // Application (authentifiée)
  OrganizationDashboard: 'org-dashboard',
  EntityDashboard: 'entity-dashboard',
  Invoices: 'invoices',
  InvoiceImport: 'invoice-import',
  InvoiceDetail: 'invoice-detail',
  Transactions: 'transactions',
  TransactionImport: 'transaction-import',
  MissingReceipts: 'missing-receipts',
  Reconciliations: 'reconciliations',
  Allocations: 'allocations',
  Cards: 'cards',
  Users: 'users',
  Categories: 'categories',
  CostCenters: 'cost-centers',
  Budgets: 'budgets',
  Subscriptions: 'subscriptions',
  AiInsights: 'ai-insights',
  AiUsage: 'ai-usage',
  Settings: 'settings',
  PrivacySettings: 'privacy-settings',
} as const

export type RouteNameValue = (typeof RouteName)[keyof typeof RouteName]
