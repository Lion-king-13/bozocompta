import { ApiError, emitApiError, takeSimulatedError, toApiError } from '@/core/errors'

/**
 * Runtime commun à TOUS les services mock. Chaque méthode mock passe par `run()` :
 * 1. attend la latence simulée (0 en test) ;
 * 2. lève l'erreur simulée si un scénario est actif pour cette opération ;
 * 3. exécute la logique en mémoire ;
 * 4. renvoie une COPIE profonde du résultat (une vue ne peut pas modifier le jeu de données
 *    par accident, comme avec une vraie API).
 */
export interface MockRuntime {
  run<T>(operation: string, fn: () => T): Promise<T>
}

export interface MockRuntimeOptions {
  latencyMs: number
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createMockRuntime(options: MockRuntimeOptions): MockRuntime {
  return {
    async run<T>(operation: string, fn: () => T): Promise<T> {
      if (options.latencyMs > 0) await sleep(options.latencyMs)
      try {
        const simulated = takeSimulatedError(operation)
        if (simulated) throw simulated
        return structuredClone(fn())
      } catch (error) {
        const apiError = toApiError(error, operation)
        emitApiError(apiError)
        throw apiError
      }
    },
  }
}

/** Erreurs « métier » que les services mock lèvent comme le ferait l'API. */
export function notFound(operation: string, what: string): ApiError {
  return new ApiError({
    code: 'NOT_FOUND',
    status: 404,
    message: `${what} introuvable.`,
    operation,
  })
}

export function validationError(operation: string, field: string, message: string): ApiError {
  return new ApiError({
    code: 'VALIDATION_ERROR',
    status: 422,
    message: 'Certaines informations sont invalides.',
    details: [{ field, message }],
    operation,
  })
}

export function conflict(operation: string, message: string): ApiError {
  return new ApiError({ code: 'CONFLICT', status: 409, message, operation })
}
