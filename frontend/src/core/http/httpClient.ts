import {
  ApiError,
  DEFAULT_ERROR_MESSAGES,
  codeFromStatus,
  emitApiError,
  isApiErrorCode,
  type FieldError,
} from '@/core/errors'

/**
 * Client HTTP minimal (fetch) utilisé par toutes les implémentations `http*Service`.
 * - préfixe les chemins par `baseUrl` (VITE_API_BASE_URL) ;
 * - ajoute `Authorization: Bearer <token>` si un jeton est disponible ;
 * - convertit TOUT échec en `ApiError` (réseau, timeout, statut HTTP non 2xx) ;
 * - comprend le format d'erreur convenu avec la partie A ET le format 422 par défaut de FastAPI.
 */

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface RequestOptions {
  query?: QueryParams
  body?: unknown
  /** Nom logique de l'opération (ex. `invoices.list`), repris dans l'ApiError. */
  operation?: string
}

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, options?: RequestOptions): Promise<T>
  put<T>(path: string, options?: RequestOptions): Promise<T>
  patch<T>(path: string, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
}

export interface HttpClientConfig {
  baseUrl: string
  timeoutMs: number
  /** Retourne le jeton de session courant (ou null). */
  getToken: () => string | null
  /** Injectable pour les tests. */
  fetchFn?: typeof fetch
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Formats d'erreur acceptés :
 * - convenu (CONTRATS_API.md) : `{ "error": { "code", "message", "details": [{ field, message }] } }`
 * - FastAPI natif : `{ "detail": "texte" }` ou `{ "detail": [{ "loc": [...], "msg": "..." }] }`
 */
export function parseErrorBody(status: number, body: unknown, operation?: string): ApiError {
  let code = codeFromStatus(status)
  let message = DEFAULT_ERROR_MESSAGES[code]
  let details: FieldError[] = []

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    const err = b.error as Record<string, unknown> | undefined
    if (err && typeof err === 'object') {
      if (isApiErrorCode(err.code)) {
        code = err.code
        message = DEFAULT_ERROR_MESSAGES[code]
      }
      if (typeof err.message === 'string') message = err.message
      if (Array.isArray(err.details)) {
        details = err.details.filter(
          (d): d is FieldError =>
            !!d && typeof d.field === 'string' && typeof d.message === 'string',
        )
      }
    } else if (typeof b.detail === 'string') {
      message = b.detail
    } else if (Array.isArray(b.detail)) {
      details = b.detail.map((d: { loc?: unknown[]; msg?: string }) => ({
        field: Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '',
        message: d.msg ?? '',
      }))
    }
  }
  return new ApiError({ code, status, message, details, operation })
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const fetchFn = config.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { operation } = options
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs)
    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = config.getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    let body: BodyInit | undefined
    if (options.body instanceof FormData) {
      body = options.body // le navigateur fixe lui-même le Content-Type multipart
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    try {
      let response: Response
      try {
        response = await fetchFn(buildUrl(config.baseUrl, path, options.query), {
          method,
          headers,
          body,
          signal: controller.signal,
        })
      } catch {
        const timedOut = controller.signal.aborted
        throw new ApiError({
          code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
          status: 0,
          message: DEFAULT_ERROR_MESSAGES[timedOut ? 'TIMEOUT' : 'NETWORK_ERROR'],
          operation,
        })
      }

      const text = await response.text()
      let data: unknown = undefined
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
      }
      if (!response.ok) throw parseErrorBody(response.status, data, operation)
      return data as T
    } catch (error) {
      if (error instanceof ApiError) emitApiError(error)
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    patch: (path, options) => request('PATCH', path, options),
    delete: (path, options) => request('DELETE', path, options),
  }
}
