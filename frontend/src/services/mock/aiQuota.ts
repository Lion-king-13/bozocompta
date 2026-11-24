import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { AI_COST_PER_MILLION_TOKENS_CENTS, getPlan } from '@/config/plans'
import { ApiError, DEFAULT_ERROR_MESSAGES } from '@/core/errors'
import { computeAiCostCents } from '@/domain/finance'
import type { AiFeature, User } from '@/domain'
import type { MockContext } from './context'

/** Tokens IA consommés par l'organisation sur le mois courant de la démo. */
export function tokensUsedThisMonth(ctx: MockContext, organizationId: string): number {
  return ctx.db.aiUsage
    .filter((r) => r.organizationId === organizationId && r.date.startsWith(DEMO_CURRENT_MONTH))
    .reduce((acc, r) => acc + r.inputTokens + r.outputTokens, 0)
}

/**
 * Vérifie le quota de l'offre AVANT un appel IA (simulé) : `AI_QUOTA_EXCEEDED` si l'appel
 * ferait dépasser le quota d'une offre à limite stricte.
 */
export function assertAiQuota(
  ctx: MockContext,
  user: User,
  tokens: number,
  operation: string,
): void {
  const org = ctx.db.organizations.find((o) => o.id === user.organizationId)
  if (!org) return
  const plan = getPlan(org.planId)
  if (
    plan.aiHardLimit &&
    tokensUsedThisMonth(ctx, org.id) + tokens > plan.includedAiTokensPerMonth
  ) {
    throw new ApiError({
      code: 'AI_QUOTA_EXCEEDED',
      status: 429,
      message: DEFAULT_ERROR_MESSAGES.AI_QUOTA_EXCEEDED,
      operation,
    })
  }
}

/** Enregistre la consommation d'un appel IA RÉUSSI (un appel échoué ne consomme rien). */
export function recordAiUsage(
  ctx: MockContext,
  user: User,
  feature: AiFeature,
  tokens: number,
): void {
  const inputTokens = Math.round(tokens * 0.8)
  ctx.db.aiUsage.push({
    id: ctx.nextId('aiu'),
    organizationId: user.organizationId,
    userId: user.id,
    feature,
    date: ctx.now().slice(0, 10),
    inputTokens,
    outputTokens: tokens - inputTokens,
    costCents: computeAiCostCents(tokens, AI_COST_PER_MILLION_TOKENS_CENTS),
  })
}
