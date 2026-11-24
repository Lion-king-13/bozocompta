import { ApiError, DEFAULT_ERROR_MESSAGES, type ApiErrorCode, type FieldError } from './ApiError'

/**
 * Catalogue des erreurs SIMULABLES en mode démo (services mock uniquement).
 *
 * Les quatre scénarios `featured` sont la PROPOSITION TECHNIQUE du groupe pour l'exigence
 * « quatre erreurs simulables » (cahier des charges §8) — ce n'est pas une liste imposée
 * explicitement par le professeur. Les autres scénarios servent aux tests de l'interface
 * (session expirée, accès refusé…).
 *
 * Pour ajouter un scénario : ajouter UNE entrée ci-dessous. Le type `ErrorScenarioId`,
 * le panneau « mode démo » et le paramètre d'URL `?demoError=` le prennent en compte.
 */
export interface ErrorScenario {
  /** Libellé affiché dans le panneau mode démo. */
  label: string
  /** Mis en avant dans le panneau (les quatre erreurs de l'exigence §8). */
  featured: boolean
  /** Opérations visées par défaut (voir `scopeMatches`) : `*`, un domaine ou une opération. */
  defaultScope: string
  /** Fabrique l'erreur levée par le service mock. */
  create: (operation: string) => ApiError
}

function scenario(
  label: string,
  featured: boolean,
  defaultScope: string,
  code: ApiErrorCode,
  status: number,
  details?: FieldError[],
): ErrorScenario {
  return {
    label,
    featured,
    defaultScope,
    create: (operation) =>
      new ApiError({ code, status, message: DEFAULT_ERROR_MESSAGES[code], details, operation }),
  }
}

export const ERROR_SCENARIOS = {
  // — Les quatre erreurs mises en avant (§8) —
  invalidFile: scenario('1. Import d’un fichier invalide', true, 'imports', 'INVALID_FILE', 422, [
    { field: 'file', message: 'Fichier refusé (erreur simulée).' },
  ]),
  aiUnavailable: scenario('2. Service IA indisponible', true, 'ai', 'AI_UNAVAILABLE', 503),
  aiQuotaExceeded: scenario('3. Quota IA dépassé', true, 'ai', 'AI_QUOTA_EXCEEDED', 429),
  network: scenario('4. API indisponible / erreur réseau', true, '*', 'NETWORK_ERROR', 0),
  // — Scénarios complémentaires —
  unauthorized: scenario('401 — session expirée', false, '*', 'UNAUTHENTICATED', 401),
  forbidden: scenario('403 — accès refusé', false, '*', 'FORBIDDEN', 403),
  validation: scenario('422 — données invalides', false, '*', 'VALIDATION_ERROR', 422, [
    { field: 'simulated', message: 'Champ invalide (erreur simulée).' },
  ]),
  server: scenario('500 — erreur serveur', false, '*', 'SERVER_ERROR', 500),
  timeout: scenario('Délai dépassé (timeout)', false, '*', 'TIMEOUT', 0),
} satisfies Record<string, ErrorScenario>

export type ErrorScenarioId = keyof typeof ERROR_SCENARIOS

export const ERROR_SCENARIO_IDS = Object.keys(ERROR_SCENARIOS) as ErrorScenarioId[]

export function isErrorScenarioId(value: unknown): value is ErrorScenarioId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ERROR_SCENARIOS, value)
}
