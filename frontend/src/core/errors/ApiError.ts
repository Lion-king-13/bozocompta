/**
 * Type d'erreur applicatif UNIQUE : tout service (mock ou HTTP) rejette ses promesses
 * avec une `ApiError`. Les vues n'ont donc qu'un seul cas à gérer.
 */

export type ApiErrorCode =
  // — Les quatre erreurs simulables mises en avant (cahier des charges §8) —
  | 'INVALID_FILE' // (1) fichier importé invalide (pas un PDF, vide, CSV mal formé)
  | 'AI_UNAVAILABLE' // (2) service IA indisponible (503)
  | 'AI_QUOTA_EXCEEDED' // (3) quota de tokens IA du plan dépassé (429)
  | 'NETWORK_ERROR' // (4) API injoignable : pas de réponse (serveur arrêté, CORS, hors ligne)
  // — Autres erreurs gérées —
  | 'TIMEOUT' // pas de réponse dans le délai imparti
  | 'UNAUTHENTICATED' // 401 : session absente ou expirée
  | 'FORBIDDEN' // 403 : authentifié mais droit insuffisant
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409 : état incompatible (ex. rapprochement déjà validé)
  | 'VALIDATION_ERROR' // 422 : données invalides (détail par champ)
  | 'RATE_LIMITED' // 429 générique (le quota IA a son propre code)
  | 'SERVER_ERROR' // 5xx
  | 'UNKNOWN'

/** Détail d'une erreur de validation, rattaché à un champ du formulaire. */
export interface FieldError {
  /** Chemin du champ, ex. `lines.0.unitPriceCents`. */
  field: string
  message: string
}

export interface ApiErrorInit {
  code: ApiErrorCode
  /** Statut HTTP ; 0 quand il n'y a pas eu de réponse (réseau, timeout). */
  status: number
  message: string
  details?: FieldError[]
  /** Opération concernée, ex. `invoices.list` (utile au debug). */
  operation?: string
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details: FieldError[]
  readonly operation?: string

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.details = init.details ?? []
    this.operation = init.operation
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

export const API_ERROR_CODES: readonly ApiErrorCode[] = [
  'INVALID_FILE',
  'AI_UNAVAILABLE',
  'AI_QUOTA_EXCEEDED',
  'NETWORK_ERROR',
  'TIMEOUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'UNKNOWN',
]

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value)
}

/** Correspondance statut HTTP → code applicatif (si le corps ne précise pas de `code`). */
export function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 400 || status === 422) return 'VALIDATION_ERROR'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'SERVER_ERROR'
  return 'UNKNOWN'
}

/** Messages par défaut, en français, affichables tels quels à l'utilisateur. */
export const DEFAULT_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_FILE: "Le fichier importé n'est pas valide.",
  // Textes UNIQUES (QA-35) : aucune promesse ici ; l'écran ajoute la suite (saisie ou
  // rapprochement manuel) seulement là où elle est réellement proposée.
  AI_UNAVAILABLE: 'Le service d’IA est momentanément indisponible.',
  AI_QUOTA_EXCEEDED: 'Le quota de tokens IA de votre offre est atteint pour ce mois.',
  NETWORK_ERROR: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  TIMEOUT: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.',
  UNAUTHENTICATED: 'Votre session a expiré. Veuillez vous reconnecter.',
  FORBIDDEN: "Vous n'avez pas les droits nécessaires pour cette action.",
  NOT_FOUND: "L'élément demandé est introuvable.",
  CONFLICT: "Cette action n'est plus possible : les données ont changé entre-temps.",
  VALIDATION_ERROR: 'Certaines informations sont invalides.',
  RATE_LIMITED: 'Quota atteint. Réessayez plus tard ou changez de formule.',
  SERVER_ERROR: 'Une erreur est survenue sur le serveur. Réessayez plus tard.',
  UNKNOWN: 'Une erreur inattendue est survenue.',
}

/** Convertit n'importe quelle erreur (y compris un bug JS) en `ApiError`. */
export function toApiError(error: unknown, operation?: string): ApiError {
  if (isApiError(error)) return error
  return new ApiError({
    code: 'UNKNOWN',
    status: 0,
    message: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGES.UNKNOWN,
    operation,
  })
}
