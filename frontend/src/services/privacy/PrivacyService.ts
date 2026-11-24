import type { DataExport, DeletionRequest, DeletionScope } from '@/domain'

/**
 * Confidentialité / RGPD. En mock, les effets sont RÉELS sur l'état en mémoire pour la
 * session (un rechargement de page restaure le jeu initial) ; le traitement légal réel
 * relève du backend (partie A).
 */
export interface PrivacyService {
  /** Export des données de l'utilisateur connecté (JSON). */
  exportMyData(): Promise<DataExport>
  /**
   * Suppression : `my_account` (son propre compte, puis déconnexion) ou `organization`
   * (toutes les données financières de l'organisation, rôle admin).
   */
  requestDeletion(scope: DeletionScope): Promise<DeletionRequest>
  listDeletionRequests(): Promise<DeletionRequest[]>
  /** Mode démo uniquement : restaure le jeu de données initial. Indisponible en mode http. */
  resetDemoData(): Promise<void>
}
