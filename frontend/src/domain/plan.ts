import type { Cents } from './common'

/** Identifiant d'un palier commercial (voir `src/config/plans.ts`). */
export type PlanId = 'plan-essentiel' | 'plan-pro'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  monthlyPriceCents: Cents
  maxEntities: number
  maxUsers: number
  /** Quota mensuel de tokens IA inclus. */
  includedAiTokensPerMonth: number
  /** true : les fonctions IA sont bloquées une fois le quota atteint (erreur AI_QUOTA_EXCEEDED). */
  aiHardLimit: boolean
  features: string[]
}
