import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { getErrorSimulation } from '@/core/errors'
import { setServices } from '@/services'
import { createTestServices } from '@/test/helpers'
import { useDemoModeStore } from './demoMode'

describe('store mode démo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setServices(createTestServices())
  })

  it('active un scénario avec sa portée par défaut', () => {
    const demo = useDemoModeStore()
    demo.activate('aiUnavailable')
    expect(getErrorSimulation()).toEqual({ scenario: 'aiUnavailable', scope: 'ai', mode: 'always' })
    expect(demo.simulation?.scenario).toBe('aiUnavailable')
    demo.clear()
    expect(demo.simulation).toBeNull()
  })

  it('se pilote par l’URL (?demoError=…)', () => {
    const demo = useDemoModeStore()
    expect(demo.applyFromQuery({ demoError: 'network', demoErrorMode: 'once' })).toBe(true)
    expect(getErrorSimulation()).toEqual({ scenario: 'network', scope: '*', mode: 'once' })
    expect(demo.applyFromQuery({ demoError: 'off' })).toBe(true)
    expect(getErrorSimulation()).toBeNull()
    expect(demo.applyFromQuery({ demoError: 'inconnu' })).toBe(false)
  })
})
