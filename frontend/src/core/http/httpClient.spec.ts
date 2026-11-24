import { describe, expect, it, vi } from 'vitest'
import { buildUrl, createHttpClient } from './httpClient'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function client(fetchFn: typeof fetch, token: string | null = 'tok') {
  return createHttpClient({
    baseUrl: 'http://api.test/api/v1',
    timeoutMs: 50,
    getToken: () => token,
    fetchFn,
  })
}

describe('client HTTP', () => {
  it('construit l’URL avec les paramètres non vides', () => {
    expect(buildUrl('http://a/v1', '/invoices', { page: 2, status: undefined, search: '' })).toBe(
      'http://a/v1/invoices?page=2',
    )
  })

  it('envoie le jeton et du JSON', async () => {
    const fetchFn = vi.fn(async () => json(200, { ok: true }))
    await expect(client(fetchFn).post('/x', { body: { a: 1 } })).resolves.toEqual({ ok: true })
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(init.body).toBe('{"a":1}')
  })

  it('convertit une panne réseau en NETWORK_ERROR', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(client(fetchFn).get('/x')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    })
  })

  it('convertit un délai dépassé en TIMEOUT', async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    ) as unknown as typeof fetch
    await expect(client(fetchFn).get('/x')).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('lit le format d’erreur convenu (code applicatif prioritaire)', async () => {
    const fetchFn = vi.fn(async () =>
      json(429, { error: { code: 'AI_QUOTA_EXCEEDED', message: 'Quota atteint' } }),
    )
    await expect(client(fetchFn).get('/x')).rejects.toMatchObject({
      code: 'AI_QUOTA_EXCEEDED',
      status: 429,
      message: 'Quota atteint',
    })
  })

  it('lit le format 422 natif de FastAPI', async () => {
    const fetchFn = vi.fn(async () =>
      json(422, { detail: [{ loc: ['body', 'lines', 0, 'quantity'], msg: 'must be > 0' }] }),
    )
    await expect(client(fetchFn).post('/x')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'lines.0.quantity', message: 'must be > 0' }],
    })
  })

  it('associe 401 / 403 / 500 aux codes applicatifs', async () => {
    for (const [status, code] of [
      [401, 'UNAUTHENTICATED'],
      [403, 'FORBIDDEN'],
      [503, 'SERVER_ERROR'],
    ] as const) {
      await expect(client(vi.fn(async () => json(status, {}))).get('/x')).rejects.toMatchObject({
        code,
        status,
      })
    }
  })
})
