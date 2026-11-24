import { DEMO_NOW } from '@/config/demo'
import type { MockRuntime } from '@/core/mock/mockRuntime'
import type { Id, IsoDateTime } from '@/domain'
import { createMockDb, type Dataset } from '@/mocks/dataset'

/**
 * État partagé par tous les services mock d'une même instance :
 * le jeu de données en mémoire, le runtime (latence + erreurs simulées) et la session simulée.
 * Toujours lire `ctx.db` au moment de l'appel (il est remplacé par `reset()`).
 */
export interface MockContext {
  db: Dataset
  runtime: MockRuntime
  /** Utilisateur connecté (simulation). */
  session: { userId: Id | null }
  now(): IsoDateTime
  nextId(prefix: string): Id
  /** Restaure le jeu de données initial (action « réinitialiser la démo »). */
  reset(): void
}

export function createMockContext(runtime: MockRuntime): MockContext {
  let counter = 0
  const ctx: MockContext = {
    db: createMockDb(),
    runtime,
    session: { userId: null },
    now: () => DEMO_NOW,
    nextId: (prefix) => `${prefix}-new-${++counter}`,
    reset() {
      ctx.db = createMockDb()
    },
  }
  return ctx
}
