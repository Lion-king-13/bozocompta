import type { DateRange, DueItem, Id, RecurringSubscription } from '@/domain'

/** Abonnements FOURNISSEURS et échéances (renouvellements + factures à payer). */
export interface SubscriptionService {
  listSubscriptions(query?: { entityId?: Id }): Promise<RecurringSubscription[]>
  /** Échéances de la période ; défaut = 30 jours à partir de la date de démo. */
  listDueItems(query?: { entityId?: Id; range?: DateRange }): Promise<DueItem[]>
}
