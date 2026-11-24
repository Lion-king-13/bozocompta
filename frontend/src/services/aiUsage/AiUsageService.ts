import type { AiUsageQuery, AiUsageRecord, AiUsageSummary, Page } from '@/domain'

/** Consommation de tokens IA, coûts indicatifs et quota de l'offre de l'organisation. */
export interface AiUsageService {
  /** Synthèse d'un mois (`YYYY-MM`, défaut = mois courant de la démo). */
  getUsageSummary(query?: { month?: string }): Promise<AiUsageSummary>
  listUsage(query?: AiUsageQuery): Promise<Page<AiUsageRecord>>
}
