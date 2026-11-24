import { addDays, type DateRange } from '@/core/dates/dates'
import { sumCents } from '@/core/money'
import type { AiUsageRecord, Cents } from '@/domain'

/**
 * Regroupements de la consommation IA pour l'affichage (tokens et coûts estimés, PAS des
 * dépenses). Les totaux du mois viennent de `summarizeAiUsage` (via le service) ; ces
 * fonctions ne font que ventiler les mêmes enregistrements par jour, par mois et par sens.
 */
export interface UsageBucket {
  key: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costCents: Cents
  records: number
}

function bucket(key: string, records: readonly AiUsageRecord[]): UsageBucket {
  const inputTokens = records.reduce((a, r) => a + r.inputTokens, 0)
  const outputTokens = records.reduce((a, r) => a + r.outputTokens, 0)
  return {
    key,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costCents: sumCents(records.map((r) => r.costCents)),
    records: records.length,
  }
}

/** Total d'une liste d'enregistrements (tokens d'entrée / de sortie, coût, nombre). */
export function usageTotals(records: readonly AiUsageRecord[]): UsageBucket {
  return bucket('total', records)
}

/** Un point par jour de la période (0 les jours sans consommation). */
export function usageByDay(records: readonly AiUsageRecord[], range: DateRange): UsageBucket[] {
  const days: UsageBucket[] = []
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
    days.push(
      bucket(
        d,
        records.filter((r) => r.date === d),
      ),
    )
  }
  return days
}

/** Un total par mois `YYYY-MM`, dans l'ordre chronologique. */
export function usageByMonth(records: readonly AiUsageRecord[]): UsageBucket[] {
  const months = [...new Set(records.map((r) => r.date.slice(0, 7)))].sort()
  return months.map((m) =>
    bucket(
      m,
      records.filter((r) => r.date.startsWith(m)),
    ),
  )
}

const TOKENS = new Intl.NumberFormat('fr-BE')

/** « 12 480 tokens » */
export function formatTokens(tokens: number): string {
  return `${TOKENS.format(tokens)} tokens`
}

/** Version courte pour les axes : « 12 480 ». */
export function formatTokenCount(tokens: number): string {
  return TOKENS.format(tokens)
}
