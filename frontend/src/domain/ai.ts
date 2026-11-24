import type { BasisPoints, Cents, Id, IsoDate, IsoDateTime, PageQuery } from './common'

/**
 * Analyses IA SIMULÉES : aucun appel à un modèle réel (aucun appel OpenRouter côté front).
 * Les résultats sont écrits à la main dans le jeu mock (produits plus tard par le backend A).
 */
export type AiInsightType =
  'anomaly' | 'duplicate' | 'price_increase' | 'redundant_subscription' | 'optimization'

export const AI_INSIGHT_TYPE_LABELS: Record<AiInsightType, string> = {
  anomaly: 'Anomalie',
  duplicate: 'Doublon potentiel',
  price_increase: 'Hausse de prix',
  redundant_subscription: 'Abonnement redondant',
  optimization: 'Optimisation',
}

export type AiInsightSeverity = 'info' | 'warning' | 'critical'
/** L'IA suggère, l'humain décide : `open` tant que personne n'a statué. */
export type AiInsightStatus = 'open' | 'dismissed' | 'resolved'

export interface AiInsight {
  id: Id
  organizationId: Id
  entityId: Id | null
  type: AiInsightType
  severity: AiInsightSeverity
  title: string
  description: string
  relatedInvoiceIds: Id[]
  relatedTransactionIds: Id[]
  relatedSubscriptionIds: Id[]
  /** Économie potentielle estimée (annuelle), le cas échéant. */
  estimatedSavingsCents: Cents | null
  status: AiInsightStatus
  createdAt: IsoDateTime
  decidedAt: IsoDateTime | null
  decidedByUserId: Id | null
}

export interface AiInsightQuery {
  type?: AiInsightType
  status?: AiInsightStatus
  entityId?: Id
}

export type AiFeature = 'invoice_extraction' | 'reconciliation_suggestion' | 'insight_generation'

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  invoice_extraction: 'Extraction de factures',
  reconciliation_suggestion: 'Suggestions de rapprochement',
  insight_generation: 'Analyses et anomalies',
}

/** Consommation IA agrégée par jour, utilisateur et fonctionnalité. */
export interface AiUsageRecord {
  id: Id
  organizationId: Id
  userId: Id
  feature: AiFeature
  date: IsoDate
  inputTokens: number
  outputTokens: number
  /** Coût estimé, arrondi au centime par enregistrement. */
  costCents: Cents
}

export interface AiUsageQuery extends PageQuery {
  from?: IsoDate
  to?: IsoDate
  feature?: AiFeature
  userId?: Id
}

export interface AiUsageSummary {
  periodStart: IsoDate
  periodEnd: IsoDate
  totalTokens: number
  /** Quota mensuel du plan de l'organisation. */
  includedTokens: number
  /** Part du quota consommée, en points de base (peut dépasser 10 000). */
  quotaUsedBp: BasisPoints
  quotaExceeded: boolean
  totalCostCents: Cents
  byFeature: { feature: AiFeature; tokens: number; costCents: Cents }[]
}
