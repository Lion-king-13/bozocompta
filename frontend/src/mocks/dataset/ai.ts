import { AI_COST_PER_MILLION_TOKENS_CENTS } from '@/config/plans'
import { addDays } from '@/core/dates/dates'
import { computeAiCostCents } from '@/domain/finance'
import type { AiFeature, AiInsight, AiUsageRecord, Id } from '@/domain'

/** Analyses IA SIMULÉES, écrites à la main (aucun appel à un modèle). */
const insight = (i: Omit<AiInsight, 'organizationId' | 'relatedInvoiceIds' | 'relatedTransactionIds' | 'relatedSubscriptionIds' | 'decidedAt' | 'decidedByUserId' | 'estimatedSavingsCents' | 'status'> & Partial<AiInsight>): AiInsight => ({
  organizationId: 'org-lumen',
  relatedInvoiceIds: [],
  relatedTransactionIds: [],
  relatedSubscriptionIds: [],
  estimatedSavingsCents: null,
  status: 'open',
  decidedAt: null,
  decidedByUserId: null,
  ...i,
})

export const AI_INSIGHTS: AiInsight[] = [
  insight({
    id: 'ins-001', entityId: 'ent-be', type: 'anomaly', severity: 'critical',
    title: 'Achat par carte inhabituel sans facture',
    description: 'Paiement de 1 299,00 € chez TechStore Online avec la carte de Chloé Dubois, sans facture associée et nettement supérieur aux dépenses habituelles de cette carte.',
    relatedTransactionIds: ['tx-be-103'], createdAt: '2026-11-11T06:00:00Z',
  }),
  insight({
    id: 'ins-002', entityId: 'ent-be', type: 'duplicate', severity: 'warning',
    title: 'Doublon potentiel : TR-7741 et TR-7741-B',
    description: 'Deux factures Transports Rapides de 459,80 € TTC, même libellé, émises à deux jours d’intervalle.',
    relatedInvoiceIds: ['inv-009', 'inv-010'], createdAt: '2026-11-09T06:00:00Z',
  }),
  insight({
    id: 'ins-003', entityId: 'ent-fr', type: 'price_increase', severity: 'info',
    title: 'Hausse de prix de la fibre TéléLink (+16,67 %)',
    description: 'La ligne « Fibre bureau » passe de 59,99 € HT (octobre) à 69,99 € HT (novembre).',
    relatedInvoiceIds: ['inv-004', 'inv-011'], createdAt: '2026-11-03T06:00:00Z',
  }),
  insight({
    id: 'ins-004', entityId: null, type: 'redundant_subscription', severity: 'warning',
    title: 'Deux outils de visualisation de données',
    description: 'DataViz Pro (Belgique) et ChartBoard (France) couvrent le même besoin. Conserver un seul outil économiserait environ 1 440 € par an.',
    relatedSubscriptionIds: ['sub-dataviz', 'sub-chartboard'], estimatedSavingsCents: 144_000, createdAt: '2026-11-05T06:00:00Z',
  }),
  insight({
    id: 'ins-005', entityId: 'ent-fr', type: 'optimization', severity: 'info',
    title: 'Regrouper les forfaits mobiles',
    description: 'Une offre groupée pour 6 lignes réduirait la facture télécom d’environ 15 € par mois.',
    relatedSubscriptionIds: ['sub-telecom'], estimatedSavingsCents: 18_000, createdAt: '2026-10-20T06:00:00Z',
    status: 'dismissed', decidedAt: '2026-10-22T14:00:00Z', decidedByUserId: 'usr-alice',
  }),
  insight({
    id: 'ins-006', entityId: 'ent-fr', type: 'anomaly', severity: 'warning',
    title: 'Écart de montant sur le paiement du Cabinet Delta',
    description: 'Le virement de 1 720,00 € ne correspond pas exactement à la facture DELTA-2026-311 de 1 728,00 €.',
    relatedInvoiceIds: ['inv-005'], relatedTransactionIds: ['tx-fr-004'], createdAt: '2026-11-06T06:00:00Z',
  }),
]

/**
 * Consommation IA générée par une formule DÉTERMINISTE (pas de Math.random) du 1er octobre
 * au 20 novembre 2026 : mêmes valeurs à chaque chargement.
 */
function usage(date: string, feature: AiFeature, userId: Id, inputTokens: number): AiUsageRecord {
  const outputTokens = Math.floor(inputTokens / 4)
  return {
    id: `aiu-${date}-${feature}`,
    organizationId: 'org-lumen',
    userId,
    feature,
    date,
    inputTokens,
    outputTokens,
    costCents: computeAiCostCents(inputTokens + outputTokens, AI_COST_PER_MILLION_TOKENS_CENTS),
  }
}

function generateUsage(): AiUsageRecord[] {
  const records: AiUsageRecord[] = []
  for (let day = 0; day < 51; day++) {
    const date = addDays('2026-10-01', day)
    records.push(usage(date, 'invoice_extraction', 'usr-bruno', 2_000 + ((day * 37) % 11) * 400))
    records.push(usage(date, 'reconciliation_suggestion', 'usr-bruno', 800 + ((day * 53) % 7) * 150))
    if (day % 7 === 0) records.push(usage(date, 'insight_generation', 'usr-alice', 6_000 + (day % 3) * 1_000))
  }
  return records
}

export const AI_USAGE: AiUsageRecord[] = generateUsage()
