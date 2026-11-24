import type { Tone } from '@/components/ui'
import type { ApiError } from '@/core/errors'
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
      text: 'L’analyse n’a pas pu être lancée et aucun quota n’a été consommé. Les suggestions déjà enregistrées restent consultables ; réessayez dans un instant.',
    }
  if (error.code === 'AI_QUOTA_EXCEEDED')
    return {
      title: 'Quota IA dépassé',
      text: 'Le quota de tokens IA de votre offre est atteint pour ce mois : l’analyse est suspendue jusqu’au renouvellement. Le travail manuel reste possible.',
    }
  return { title: 'L’analyse a échoué', text: error.message }
}

const DATE_TIME = new Intl.DateTimeFormat('fr-BE', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
})

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso))
}
