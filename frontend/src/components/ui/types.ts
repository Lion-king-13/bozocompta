/**
 * Types partagés par les composants d'interface (dossier components/ui).
 * Ces types sont purement visuels : ils ne dépendent d'aucun modèle métier.
 */

/** Ton visuel d'un badge, d'une alerte ou d'un toast. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/**
 * Provenance d'une donnée (transparence IA, §9 du cahier des charges).
 * - extracted : extrait automatiquement par l'IA depuis un document ;
 * - suggested : proposé par l'IA, en attente d'une décision humaine ;
 * - corrected : modifié par un utilisateur après extraction ;
 * - validated : confirmé par un utilisateur ;
 * - recorded  : donnée financière enregistrée (source de vérité).
 */
export type AiProvenance = 'extracted' | 'suggested' | 'corrected' | 'validated' | 'recorded'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface DataTableColumn {
  /** Nom de la propriété lue dans chaque ligne (et nom du slot `cell-<key>`). */
  key: string
  /** En-tête affiché (et libellé de la ligne en vue mobile). */
  label: string
  /** Aligne à droite et active les chiffres tabulaires (montants). */
  numeric?: boolean
  /** Colonne triable : un clic émet `sort`. */
  sortable?: boolean
  /** Masquée en vue mobile (cartes) pour alléger l'affichage. */
  hideOnMobile?: boolean
  /** Largeur CSS facultative, ex. '8rem'. */
  width?: string
}

export type SortDirection = 'ascending' | 'descending'

export interface TabItem {
  id: string
  label: string
  /** Petit compteur affiché après le libellé (ex. nombre d'éléments). */
  count?: number
  disabled?: boolean
}

export interface ToastItem {
  id: string
  tone: Tone
  title: string
  message?: string
  /** Durée d'affichage en ms ; 0 = reste affiché jusqu'à fermeture. Défaut : 6000. */
  duration?: number
}

/** Motif de rejet d'un fichier par la zone de dépôt (avant tout envoi). */
export interface RejectedFile {
  file: File
  reason: 'type' | 'size'
  message: string
}
