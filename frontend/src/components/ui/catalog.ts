/**
 * Catalogues de libellés et d'apparence partagés.
 * Un seul endroit pour les textes des badges : on évite que deux écrans
 * affichent « À valider » et « À vérifier » pour le même état.
 */
import type { AiProvenance, Tone } from './types'
import type { IconName } from './icons'

export interface ProvenanceInfo {
  label: string
  /** Phrase d'explication (infobulle, légende, lecteur d'écran). */
  description: string
  icon: IconName
}

export const AI_PROVENANCE: Record<AiProvenance, ProvenanceInfo> = {
  extracted: {
    label: "Extrait par l'IA",
    description:
      "Valeur lue automatiquement dans le document par l'IA. À vérifier avant validation.",
    icon: 'sparkle',
  },
  suggested: {
    label: 'Suggestion IA',
    description: "Proposition de l'IA. Elle ne s'applique qu'après votre confirmation.",
    icon: 'lightbulb',
  },
  corrected: {
    label: 'Corrigé',
    description: 'Valeur modifiée par un utilisateur après extraction.',
    icon: 'pencil',
  },
  validated: {
    label: 'Validé',
    description: 'Valeur confirmée par un utilisateur.',
    icon: 'check',
  },
  recorded: {
    label: 'Enregistré',
    description: 'Donnée financière enregistrée. Elle sert de référence pour les calculs.',
    icon: 'lock',
  },
}

/** Ordre de présentation dans les légendes (du plus provisoire au plus définitif). */
export const AI_PROVENANCE_ORDER: AiProvenance[] = [
  'suggested',
  'extracted',
  'corrected',
  'validated',
  'recorded',
]

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
