import type { ApiError } from './ApiError'

/**
 * Bus minimal : chaque `ApiError` levée par un service (mock ou HTTP) est signalée ici.
 * `main.ts` s'y abonne pour les traitements transverses — en particulier la déconnexion
 * et la redirection vers la page de connexion sur un 401 (`UNAUTHENTICATED`).
 * Les vues continuent de recevoir l'erreur normalement (promesse rejetée).
 */
type ApiErrorListener = (error: ApiError) => void

const listeners = new Set<ApiErrorListener>()

export function onApiError(listener: ApiErrorListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitApiError(error: ApiError): void {
  for (const listener of listeners) listener(error)
}
