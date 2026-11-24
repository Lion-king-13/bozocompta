/**
 * Fournisseur du jeton de session pour le client HTTP.
 * Le store auth appelle `setAuthToken` à la connexion / déconnexion ; le client HTTP
 * lit `getAuthToken`. Ce petit module évite que la couche HTTP dépende de Pinia.
 */
let token: string | null = null

export function setAuthToken(value: string | null): void {
  token = value
}

export function getAuthToken(): string | null {
  return token
}
