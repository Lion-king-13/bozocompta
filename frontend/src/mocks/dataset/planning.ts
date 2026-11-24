import type { Budget, RecurringSubscription } from '@/domain'

/** Budgets MENSUELS (novembre 2026), consommés sur la base de l'imputé. */
export const BUDGETS: Budget[] = [
  { id: 'bud-be-2026-11', entityId: 'ent-be', categoryId: null, costCenterId: null, label: 'Lumen Belgium — novembre', month: '2026-11', amountCents: 300_000 },
  // Dépassé : illustre un budget en dépassement.
  { id: 'bud-be-it-2026-11', entityId: 'ent-be', categoryId: null, costCenterId: 'cc-be-it', label: 'Informatique Belgique — novembre', month: '2026-11', amountCents: 50_000 },
  { id: 'bud-fr-software-2026-11', entityId: 'ent-fr', categoryId: 'cat-software', costCenterId: null, label: 'Logiciels France — novembre', month: '2026-11', amountCents: 15_000 },
  { id: 'bud-fr-paris-2026-11', entityId: 'ent-fr', categoryId: null, costCenterId: 'cc-fr-paris', label: 'Projet France — novembre', month: '2026-11', amountCents: 150_000 },
]

/** Abonnements FOURNISSEURS récurrents (à ne pas confondre avec les offres CashLens). */
export const SUBSCRIPTIONS: RecurringSubscription[] = [
  { id: 'sub-cloud', entityId: 'ent-be', supplierId: 'sup-cloud', categoryId: 'cat-software', costCenterId: 'cc-be-it', cardId: null, name: 'Hébergement serveurs', amountCents: 60_500, frequency: 'monthly', startDate: '2025-01-30', nextRenewalDate: '2026-11-30', status: 'active' },
  { id: 'sub-dataviz', entityId: 'ent-be', supplierId: 'sup-dataviz', categoryId: 'cat-software', costCenterId: 'cc-be-mkt', cardId: 'card-be-emma', name: 'DataViz Pro (5 licences)', amountCents: 17_545, frequency: 'monthly', startDate: '2026-03-01', nextRenewalDate: '2026-12-01', status: 'active' },
  { id: 'sub-chartboard', entityId: 'ent-fr', supplierId: 'sup-chartboard', categoryId: 'cat-software', costCenterId: 'cc-fr-ops', cardId: 'card-fr-farid', name: 'ChartBoard (4 licences)', amountCents: 12_000, frequency: 'monthly', startDate: '2026-06-03', nextRenewalDate: '2026-12-03', status: 'active' },
  { id: 'sub-telecom', entityId: 'ent-fr', supplierId: 'sup-telecom', categoryId: 'cat-telecom', costCenterId: 'cc-fr-ops', cardId: null, name: 'Forfaits mobiles et fibre', amountCents: 26_399, frequency: 'monthly', startDate: '2024-02-02', nextRenewalDate: '2026-12-02', status: 'active' },
  { id: 'sub-veille', entityId: 'ent-fr', supplierId: 'sup-delta', categoryId: 'cat-legal', costCenterId: 'cc-fr-adm', cardId: null, name: 'Veille juridique', amountCents: 96_000, frequency: 'yearly', startDate: '2025-01-15', nextRenewalDate: '2027-01-15', status: 'active' },
  { id: 'sub-old', entityId: 'ent-be', supplierId: 'sup-dataviz', categoryId: 'cat-software', costCenterId: 'cc-be-it', cardId: null, name: 'Module export DataViz (résilié)', amountCents: 3_630, frequency: 'monthly', startDate: '2025-05-01', nextRenewalDate: '2026-12-01', status: 'cancelled' },
]
