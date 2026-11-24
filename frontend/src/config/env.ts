/**
 * Lecture et validation des variables d'environnement Vite, en UN seul endroit.
 * Rappel : toute variable `VITE_*` est publique (incluse dans le bundle). Aucun secret ici.
 */

export type ApiMode = 'mock' | 'http'

export interface AppConfig {
  apiMode: ApiMode
  apiBaseUrl: string
  apiTimeoutMs: number
  mockLatencyMs: number
}

type RawEnv = Partial<Record<keyof ImportMetaEnv, string | undefined>> & { MODE?: string }

function parseNonNegativeInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`${name} doit être un entier positif (reçu : "${value}")`)
  }
  return n
}

/** Fonction pure (testable) : construit la configuration à partir d'un objet d'env brut. */
export function parseConfig(env: RawEnv): AppConfig {
  const mode = (env.VITE_API_MODE ?? 'mock').trim() || 'mock'
  if (mode !== 'mock' && mode !== 'http') {
    throw new Error(`VITE_API_MODE doit valoir "mock" ou "http" (reçu : "${mode}")`)
  }
  const isTest = env.MODE === 'test'
  return {
    apiMode: mode,
    apiBaseUrl: (env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, ''),
    apiTimeoutMs: parseNonNegativeInt(env.VITE_API_TIMEOUT_MS, 10_000, 'VITE_API_TIMEOUT_MS'),
    mockLatencyMs: isTest
      ? 0
      : parseNonNegativeInt(env.VITE_MOCK_LATENCY_MS, 300, 'VITE_MOCK_LATENCY_MS'),
  }
}

export const appConfig: AppConfig = parseConfig(import.meta.env)
