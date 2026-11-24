import type { AiInsight, AiInsightQuery, Id } from '@/domain'

/**
 * Suggestions et analyses IA (anomalies, doublons, hausses de prix, abonnements redondants,
 * optimisations). L'IA suggère, l'humain décide (`dismiss` / `resolve`).
 */
export interface AiInsightService {
  /** Lecture des analyses DÉJÀ enregistrées (pas d'appel IA). */
  listInsights(query?: AiInsightQuery): Promise<AiInsight[]>
  /** Relance l'analyse IA (SIMULÉE en mock) : consomme du quota ; erreurs IA simulables. */
  runAnalysis(): Promise<AiInsight[]>
  dismissInsight(id: Id): Promise<AiInsight>
  resolveInsight(id: Id): Promise<AiInsight>
}
