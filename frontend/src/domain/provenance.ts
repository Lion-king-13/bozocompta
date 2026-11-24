/**
 * Provenance d'une donnée (transparence IA, cahier des charges §9).
 * Portée par les objets et champs concernés (facture, ligne, champ extrait d'un PDF…).
 *
 * - `ai_extracted`   : extrait automatiquement par l'IA, non encore relu ;
 * - `ai_suggested`   : proposé par l'IA (catégorie, rapprochement…), en attente de décision humaine ;
 * - `user_corrected` : modifié par un utilisateur après extraction / suggestion ;
 * - `validated`      : relu et validé par un utilisateur, ou saisi à la main (création manuelle) ;
 * - `recorded`       : donnée financière enregistrée (import bancaire, saisie confirmée par le backend).
 */
export type DataProvenance =
  'ai_extracted' | 'ai_suggested' | 'user_corrected' | 'validated' | 'recorded'

/**
 * Libellés de provenance — SOURCE UNIQUE (QA-22). Identiques à ceux des badges
 * (`components/ui/catalog.ts`), qui devraient en dériver.
 */
export const PROVENANCE_LABELS: Record<DataProvenance, string> = {
  ai_extracted: "Extrait par l'IA",
  ai_suggested: 'Suggestion IA',
  user_corrected: 'Corrigé',
  validated: 'Validé',
  recorded: 'Enregistré',
}

/** Phrase d'explication de chaque provenance (infobulle, légende, lecteur d'écran). */
export const PROVENANCE_DESCRIPTIONS: Record<DataProvenance, string> = {
  ai_extracted:
    "Valeur lue automatiquement dans le document par l'IA. À vérifier avant validation.",
  ai_suggested: "Proposition de l'IA. Elle ne s'applique qu'après votre confirmation.",
  user_corrected: 'Valeur modifiée par un utilisateur après extraction.',
  validated: 'Valeur saisie ou confirmée par un utilisateur.',
  recorded: 'Donnée financière enregistrée. Elle sert de référence pour les calculs.',
}

/** Ordre de présentation (du plus provisoire au plus définitif). */
export const PROVENANCE_ORDER: readonly DataProvenance[] = [
  'ai_suggested',
  'ai_extracted',
  'user_corrected',
  'validated',
  'recorded',
]

/** Valeur extraite par l'IA, avec sa provenance et un indice de confiance (points de base). */
export interface ExtractedField<T> {
  value: T | null
  provenance: DataProvenance
  /** 0 – 10 000. `null` si non applicable (valeur saisie par un humain). */
  confidenceBp: number | null
}
