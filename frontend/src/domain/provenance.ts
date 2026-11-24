/**
 * Provenance d'une donnée (transparence IA, cahier des charges §9).
 * Portée par les objets et champs concernés (facture, ligne, champ extrait d'un PDF…).
 *
 * - `ai_extracted`   : extrait automatiquement par l'IA, non encore relu ;
 * - `ai_suggested`   : proposé par l'IA (catégorie, rapprochement…), en attente de décision humaine ;
 * - `user_corrected` : modifié par un utilisateur après extraction / suggestion ;
 * - `validated`      : relu et validé par un utilisateur ;
 * - `recorded`       : donnée financière enregistrée (import bancaire, saisie confirmée par le backend).
 */
export type DataProvenance =
  'ai_extracted' | 'ai_suggested' | 'user_corrected' | 'validated' | 'recorded'

export const PROVENANCE_LABELS: Record<DataProvenance, string> = {
  ai_extracted: "Extrait par l'IA",
  ai_suggested: 'Suggestion IA',
  user_corrected: 'Corrigé par un utilisateur',
  validated: 'Validé',
  recorded: 'Enregistré',
}

/** Valeur extraite par l'IA, avec sa provenance et un indice de confiance (points de base). */
export interface ExtractedField<T> {
  value: T | null
  provenance: DataProvenance
  /** 0 – 10 000. `null` si non applicable (valeur saisie par un humain). */
  confidenceBp: number | null
}
