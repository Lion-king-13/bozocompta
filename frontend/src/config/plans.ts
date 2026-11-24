import type { Plan, PlanId } from '@/domain/plan'

/**
 * Paliers commerciaux — FICHIER UNIQUE de configuration.
 * Utilisé par la landing (tarifs) ET par l'écran de consommation / quotas IA.
 *
 * ⚠ Tarifs, noms et quotas NON VALIDÉS (cahier des charges §6) : valeurs provisoires
 * à ajuster ici seulement.
 */
export const PLANS: readonly Plan[] = [
  {
    id: 'plan-essentiel',
    name: 'Essentiel',
    tagline: 'Pour une société qui veut y voir clair dans ses dépenses.',
    monthlyPriceCents: 4_900,
    maxEntities: 1,
    maxUsers: 5,
    includedAiTokensPerMonth: 200_000,
    aiHardLimit: true,
    features: [
      'Import PDF et CSV',
      'Extraction IA des factures',
      'Rapprochements suggérés',
      'Tableau de bord entité',
    ],
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    tagline: 'Pour les groupes multi-entités.',
    monthlyPriceCents: 14_900,
    maxEntities: 10,
    maxUsers: 50,
    includedAiTokensPerMonth: 1_000_000,
    aiHardLimit: true,
    features: [
      'Tout Essentiel',
      'Multi-entités et dashboard consolidé',
      'Allocations analytiques',
      'Budgets et abonnements',
      'Analyses IA (anomalies, doublons, optimisations)',
    ],
  },
]

/** Coût estimé des tokens IA (affichage de la consommation), en centimes par million. FICTIF. */
export const AI_COST_PER_MILLION_TOKENS_CENTS = 300

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id)
  if (!plan) throw new Error(`Plan inconnu : ${id}`)
  return plan
}
