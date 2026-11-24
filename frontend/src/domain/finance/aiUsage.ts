import { divideRounded, ratioBp, sumCents } from '@/core/money'
import type { AiFeature, AiUsageRecord, AiUsageSummary } from '../ai'
import type { Cents, DateRange } from '../common'

/** Coût de `tokens` au prix de `pricePerMillionCents` centimes le million, arrondi au centime. */
export function computeAiCostCents(tokens: number, pricePerMillionCents: Cents): Cents {
  return divideRounded(tokens * pricePerMillionCents, 1_000_000)
}

export function summarizeAiUsage(
  records: readonly AiUsageRecord[],
  period: DateRange,
  includedTokens: number,
): AiUsageSummary {
  const inPeriod = records.filter((r) => r.date >= period.start && r.date <= period.end)
  const byFeature = new Map<AiFeature, { tokens: number; costCents: Cents }>()
  for (const r of inPeriod) {
    const entry = byFeature.get(r.feature) ?? { tokens: 0, costCents: 0 }
    entry.tokens += r.inputTokens + r.outputTokens
    entry.costCents += r.costCents
    byFeature.set(r.feature, entry)
  }
  const totalTokens = inPeriod.reduce((acc, r) => acc + r.inputTokens + r.outputTokens, 0)
  return {
    periodStart: period.start,
    periodEnd: period.end,
    totalTokens,
    includedTokens,
    quotaUsedBp: includedTokens > 0 ? ratioBp(totalTokens, includedTokens) : 0,
    quotaExceeded: totalTokens >= includedTokens,
    totalCostCents: sumCents(inPeriod.map((r) => r.costCents)),
    byFeature: [...byFeature.entries()].map(([feature, v]) => ({ feature, ...v })),
  }
}
