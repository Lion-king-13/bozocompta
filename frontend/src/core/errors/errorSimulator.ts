import { ERROR_SCENARIOS, type ErrorScenarioId } from './errorScenarios'
import type { ApiError } from './ApiError'

/**
 * Simulateur d'erreurs pour les services MOCK (aucun effet en mode HTTP).
 *
 * Une simulation = un scénario (quelle erreur) + une portée (quelles opérations) + un mode.
 * - portée `*` : toutes les opérations ;
 * - portée `invoices` : toutes les opérations du domaine factures (`invoices.list`, `invoices.get`…) ;
 * - portée `invoices.list` : uniquement cette opération.
 * - mode `always` : l'erreur est levée à chaque appel tant que la simulation est active ;
 *   mode `once` : l'erreur est levée au prochain appel concerné puis la simulation s'arrête
 *   (pratique pour tester un bouton « Réessayer »).
 *
 * L'état est un simple module (pas Pinia) pour que les services restent indépendants de Vue.
 * Le store `useDemoModeStore` (panneau « Mode démo ») et le paramètre d'URL `?demoError=`
 * pilotent ce module.
 */

export type ErrorSimulationMode = 'always' | 'once'

export interface ErrorSimulation {
  scenario: ErrorScenarioId
  scope: string
  mode: ErrorSimulationMode
}

let active: ErrorSimulation | null = null
const listeners = new Set<(simulation: ErrorSimulation | null) => void>()

function notify(): void {
  for (const listener of listeners) listener(active)
}

export function setErrorSimulation(simulation: ErrorSimulation | null): void {
  active = simulation ? { ...simulation, scope: simulation.scope.trim() || '*' } : null
  notify()
}

export function clearErrorSimulation(): void {
  setErrorSimulation(null)
}

export function getErrorSimulation(): ErrorSimulation | null {
  return active
}

/** Permet au store mode démo de rester synchronisé (ex. après un mode `once`). */
export function onErrorSimulationChange(
  listener: (simulation: ErrorSimulation | null) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function scopeMatches(scope: string, operation: string): boolean {
  return scope === '*' || operation === scope || operation.startsWith(`${scope}.`)
}

/**
 * Appelée par le runtime mock avant chaque opération. Retourne l'erreur à lever
 * (et consomme la simulation si elle est en mode `once`), ou `null`.
 */
export function takeSimulatedError(operation: string): ApiError | null {
  if (!active || !scopeMatches(active.scope, operation)) return null
  const error = ERROR_SCENARIOS[active.scenario].create(operation)
  if (active.mode === 'once') clearErrorSimulation()
  return error
}
