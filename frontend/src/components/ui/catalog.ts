/**
 * Catalogues de libellés et d'apparence partagés.
 * Un seul endroit pour les textes des badges : on évite que deux écrans
 * affichent « À valider » et « À vérifier » pour le même état.
 */
import {
  PROVENANCE_DESCRIPTIONS,
  PROVENANCE_LABELS,
  PROVENANCE_ORDER,
  type DataProvenance,
} from '@/domain/provenance'
import type { AiProvenance, Tone } from './types'
import type { IconName } from './icons'

export interface ProvenanceInfo {
  label: string
  /** Phrase d'explication (infobulle, légende, lecteur d'écran). */
  description: string
  icon: IconName
}

/**
 * Correspondance domaine → interface : `<AiProvenanceBadge>` accepte les deux écritures.
 * Les écrans n'ont pas besoin de leur propre table de correspondance.
 */
export const DOMAIN_PROVENANCE_TO_UI: Record<DataProvenance, AiProvenance> = {
  ai_extracted: 'extracted',
  ai_suggested: 'suggested',
  user_corrected: 'corrected',
  validated: 'validated',
  recorded: 'recorded',
}

/** Icône de chaque état (la seule information propre à l'interface). */
const PROVENANCE_ICONS: Record<DataProvenance, IconName> = {
  ai_extracted: 'sparkle',
  ai_suggested: 'lightbulb',
  user_corrected: 'pencil',
  validated: 'check',
  recorded: 'lock',
}

function info(provenance: DataProvenance): ProvenanceInfo {
  return {
    label: PROVENANCE_LABELS[provenance],
    description: PROVENANCE_DESCRIPTIONS[provenance],
    icon: PROVENANCE_ICONS[provenance],
  }
}

/**
 * Libellés, explications et icônes des cinq états. Libellés et explications DÉRIVÉS de
 * `domain/provenance.ts` (source unique, QA-22).
 */
export const AI_PROVENANCE: Record<AiProvenance, ProvenanceInfo> = {
  extracted: info('ai_extracted'),
  suggested: info('ai_suggested'),
  corrected: info('user_corrected'),
  validated: info('validated'),
  recorded: info('recorded'),
}

/** Normalise une provenance (écriture du domaine ou de l'interface). */
export function toUiProvenance(value: AiProvenance | DataProvenance): AiProvenance {
  if (value in AI_PROVENANCE) return value as AiProvenance
  return DOMAIN_PROVENANCE_TO_UI[value as DataProvenance] ?? 'extracted'
}

/** Ordre de présentation dans les légendes (du plus provisoire au plus définitif). */
export const AI_PROVENANCE_ORDER: AiProvenance[] = PROVENANCE_ORDER.map(
  (p) => DOMAIN_PROVENANCE_TO_UI[p],
)

export interface StatusInfo {
  label: string
  tone: Tone
  icon: IconName
}

/**
 * Statuts métier courants (vocabulaire d'interface).
 * Les écrans font la correspondance entre les statuts du domaine
 * (ex. InvoiceStatus) et ces clés, ou passent directement `tone` + `label`
 * au badge.
 */
export const BUSINESS_STATUS = {
  to_validate: { label: 'À valider', tone: 'warning', icon: 'clock' },
  pending: { label: 'En attente', tone: 'neutral', icon: 'clock' },
  draft: { label: 'Brouillon', tone: 'neutral', icon: 'pencil' },
  validated: { label: 'Validée', tone: 'success', icon: 'check' },
  paid: { label: 'Payée', tone: 'success', icon: 'check' },
  reconciled: { label: 'Rapprochée', tone: 'success', icon: 'link' },
  not_reconciled: { label: 'Non rapprochée', tone: 'neutral', icon: 'minus' },
  missing_receipt: { label: 'Justificatif manquant', tone: 'danger', icon: 'paperclip' },
  disputed: { label: 'Contestée', tone: 'danger', icon: 'alert-circle' },
  rejected: { label: 'Rejetée', tone: 'neutral', icon: 'x' },
  cancelled: { label: 'Annulée', tone: 'neutral', icon: 'x' },
  budget_ok: { label: 'Dans le budget', tone: 'success', icon: 'check' },
  budget_near: { label: 'Budget bientôt atteint', tone: 'warning', icon: 'alert-triangle' },
  budget_exceeded: { label: 'Budget dépassé', tone: 'danger', icon: 'alert-circle' },
  duplicate: { label: 'Doublon potentiel', tone: 'warning', icon: 'alert-triangle' },
  anomaly: { label: 'Anomalie', tone: 'danger', icon: 'alert-circle' },
  due_soon: { label: 'Échéance proche', tone: 'warning', icon: 'calendar' },
  active: { label: 'Actif', tone: 'success', icon: 'check' },
  inactive: { label: 'Inactif', tone: 'neutral', icon: 'minus' },
  blocked: { label: 'Bloquée', tone: 'danger', icon: 'lock' },
} satisfies Record<string, StatusInfo>

export type BusinessStatus = keyof typeof BUSINESS_STATUS

/** Icône par défaut d'un ton (alertes, toasts). */
export const TONE_ICON: Record<Tone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
}
