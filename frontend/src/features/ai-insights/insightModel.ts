import type { Tone } from '@/components/ui'
import { DEFAULT_ERROR_MESSAGES, type ApiError } from '@/core/errors'
import { formatIsoDate } from '@/core/dates/dates'
import type { AiInsight, AiInsightSeverity, AiInsightStatus, AiInsightType } from '@/domain'

export const INSIGHT_TYPES: AiInsightType[] = [
  'anomaly',
  'duplicate',
  'price_increase',
  'redundant_subscription',
  'optimization',
]

export const STATUS_LABELS: Record<AiInsightStatus, string> = {
  open: 'Ouverte',
  resolved: 'Acceptée',
  dismissed: 'Ignorée',
}

export const SEVERITY: Record<AiInsightSeverity, { tone: Tone; label: string }> = {
  critical: { tone: 'danger', label: 'Priorité haute' },
  warning: { tone: 'warning', label: 'À surveiller' },
  info: { tone: 'info', label: 'Information' },
}

/** Nombre de suggestions par type (pour les filtres). */
export function countByType(insights: readonly AiInsight[]): Record<AiInsightType, number> {
  const counts = Object.fromEntries(INSIGHT_TYPES.map((t) => [t, 0])) as Record<
    AiInsightType,
    number
  >
  for (const i of insights) counts[i.type] += 1
  return counts
}

/** Message affiché quand « Lancer une analyse » échoue (erreurs IA simulables). */
export function analysisErrorMessage(error: ApiError): { title: string; text: string } {
  if (error.code === 'AI_UNAVAILABLE')
    return {
      title: 'Service IA indisponible',
      text: `${DEFAULT_ERROR_MESSAGES.AI_UNAVAILABLE} L’analyse n’a pas été lancée et aucun quota n’a été consommé ; les suggestions déjà enregistrées restent consultables.`,
    }
  if (error.code === 'AI_QUOTA_EXCEEDED')
    return {
      title: 'Quota IA dépassé',
      text: `${DEFAULT_ERROR_MESSAGES.AI_QUOTA_EXCEEDED} L’analyse est suspendue jusqu’au renouvellement.`,
    }
  return { title: 'L’analyse a échoué', text: error.message }
}

/** « 2026-11-11T06:00:00Z » → « 11/11/2026 à 06:00 (UTC) » : date en JJ/MM/AAAA (QA-23). */
export function formatDateTime(iso: string): string {
  return `${formatIsoDate(iso.slice(0, 10))} à ${iso.slice(11, 16)} (UTC)`
}
