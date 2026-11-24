import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  ERROR_SCENARIOS,
  clearErrorSimulation,
  getErrorSimulation,
  isErrorScenarioId,
  onErrorSimulationChange,
  setErrorSimulation,
  type ErrorScenarioId,
  type ErrorSimulation,
  type ErrorSimulationMode,
} from '@/core/errors'
import { useServices } from '@/services'

/**
 * « Mode démo » : déclenche de façon reproductible les erreurs simulées des services mock.
 * Deux moyens, un seul mécanisme (le simulateur d'erreurs) :
 * - le panneau `DemoModePanel` (bouton « Mode démo » dans l'application) ;
 * - l'URL : `?demoError=<scénario>[&demoErrorScope=<portée>][&demoErrorMode=once|always]`
 *   (pratique pour l'e2e et l'oral). Ex. `/app?demoError=network`.
 * Sans effet en mode http.
 */
export const useDemoModeStore = defineStore('demoMode', () => {
  const available = useServices().mode === 'mock'
  const panelOpen = ref(false)
  const simulation = ref<ErrorSimulation | null>(getErrorSimulation())

  onErrorSimulationChange((s) => (simulation.value = s))

  function activate(
    scenario: ErrorScenarioId,
    options: { scope?: string; mode?: ErrorSimulationMode } = {},
  ): void {
    if (!available) return
    setErrorSimulation({
      scenario,
      scope: options.scope ?? ERROR_SCENARIOS[scenario].defaultScope,
      mode: options.mode ?? 'always',
    })
  }

  function clear(): void {
    clearErrorSimulation()
  }

  /** Lit `?demoError=` (appelé par le routeur à chaque navigation). Retourne true si appliqué. */
  function applyFromQuery(query: Record<string, unknown>): boolean {
    const scenario = query.demoError
    if (scenario === 'off') {
      clear()
      return true
    }
    if (!isErrorScenarioId(scenario)) return false
    const scope = typeof query.demoErrorScope === 'string' ? query.demoErrorScope : undefined
    const mode = query.demoErrorMode === 'once' ? 'once' : 'always'
    activate(scenario, { scope, mode })
    return true
  }

  return { available, panelOpen, simulation, activate, clear, applyFromQuery }
})
