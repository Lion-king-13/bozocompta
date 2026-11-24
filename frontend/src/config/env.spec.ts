import { describe, expect, it } from 'vitest'
import { parseConfig } from './env'

describe('parseConfig', () => {
  it('utilise le mode mock par défaut', () => {
    expect(parseConfig({})).toMatchObject({
      apiMode: 'mock',
      apiBaseUrl: 'http://localhost:8000/api/v1',
      mockLatencyMs: 300,
    })
  })
  it('lit le mode http et retire le / final', () => {
    expect(
      parseConfig({ VITE_API_MODE: 'http', VITE_API_BASE_URL: 'https://api.exemple.test/v1/' }),
    ).toMatchObject({
      apiMode: 'http',
      apiBaseUrl: 'https://api.exemple.test/v1',
    })
  })
  it('désactive la latence en test', () => {
    expect(parseConfig({ MODE: 'test', VITE_MOCK_LATENCY_MS: '500' }).mockLatencyMs).toBe(0)
  })
  it('refuse une valeur invalide', () => {
    expect(() => parseConfig({ VITE_API_MODE: 'fake' })).toThrow()
    expect(() => parseConfig({ VITE_API_TIMEOUT_MS: '-1' })).toThrow()
  })
})
