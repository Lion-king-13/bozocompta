/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (défaut) : services en mémoire. `http` : appels réels vers l'API FastAPI (partie A). */
  readonly VITE_API_MODE?: string
  /** URL de base de l'API, ex. `http://localhost:8000/api/v1`. Utilisée seulement en mode `http`. */
  readonly VITE_API_BASE_URL?: string
  /** Délai d'expiration des requêtes HTTP, en millisecondes. */
  readonly VITE_API_TIMEOUT_MS?: string
  /** Latence simulée des services mock, en millisecondes (ignorée en test). */
  readonly VITE_MOCK_LATENCY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
