import { afterEach, describe, expect, it } from 'vitest'
import { ApiError } from './ApiError'
import { ERROR_SCENARIOS, ERROR_SCENARIO_IDS, isErrorScenarioId } from './errorScenarios'
import {
  clearErrorSimulation,
  getErrorSimulation,
  scopeMatches,
  setErrorSimulation,
  takeSimulatedError,
} from './errorSimulator'

afterEach(() => clearErrorSimulation())

describe('simulateur d’erreurs', () => {
  it('met en avant exactement quatre scénarios, chacun avec un code stable', () => {
    const featured = ERROR_SCENARIO_IDS.filter((id) => ERROR_SCENARIOS[id].featured)
    expect(featured).toEqual(['invalidFile', 'aiUnavailable', 'aiQuotaExceeded', 'network'])
    expect(featured.map((id) => ERROR_SCENARIOS[id].create('x').code)).toEqual([
      'INVALID_FILE',
      'AI_UNAVAILABLE',
      'AI_QUOTA_EXCEEDED',
      'NETWORK_ERROR',
    ])
  })

  it('couvre aussi 401, 403, 422, 500 et timeout', () => {
    const codes = ERROR_SCENARIO_IDS.map((id) => ERROR_SCENARIOS[id].create('x'))
    expect(codes.map((e) => e.status)).toEqual(expect.arrayContaining([401, 403, 422, 500, 0]))
    expect(codes.map((e) => e.code)).toEqual(
      expect.arrayContaining(['UNAUTHENTICATED', 'FORBIDDEN', 'TIMEOUT']),
    )
  })

  it('reconnaît les identifiants de scénario', () => {
    expect(isErrorScenarioId('network')).toBe(true)
    expect(isErrorScenarioId('toString')).toBe(false)
    expect(isErrorScenarioId(42)).toBe(false)
  })

  it('applique la portée : *, domaine ou opération exacte', () => {
    expect(scopeMatches('*', 'invoices.list')).toBe(true)
    expect(scopeMatches('invoices', 'invoices.list')).toBe(true)
    expect(scopeMatches('invoices', 'invoicesX.list')).toBe(false)
    expect(scopeMatches('invoices.list', 'invoices.list')).toBe(true)
    expect(scopeMatches('invoices.get', 'invoices.list')).toBe(false)
  })

  it('lève l’erreur à chaque appel en mode always, une seule fois en mode once', () => {
    setErrorSimulation({ scenario: 'server', scope: 'invoices', mode: 'always' })
    expect(takeSimulatedError('cards.list')).toBeNull()
    expect(takeSimulatedError('invoices.list')).toBeInstanceOf(ApiError)
    expect(takeSimulatedError('invoices.get')?.status).toBe(500)

    setErrorSimulation({ scenario: 'forbidden', scope: '*', mode: 'once' })
    expect(takeSimulatedError('cards.list')?.code).toBe('FORBIDDEN')
    expect(takeSimulatedError('cards.list')).toBeNull()
    expect(getErrorSimulation()).toBeNull()
  })

  it('renseigne l’opération concernée dans l’erreur', () => {
    setErrorSimulation({ scenario: 'network', scope: '*', mode: 'always' })
    expect(takeSimulatedError('dashboard.summary')).toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
      operation: 'dashboard.summary',
    })
  })
})
