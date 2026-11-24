import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearErrorSimulation } from '@/core/errors'
import { createMockServices, type Services, type UploadedFile } from '@/services'

/** Services mock neufs (jeu de données initial, latence nulle). */
export function createTestServices(): Services {
  clearErrorSimulation()
  return createMockServices({ latencyMs: 0 })
}

export const EMAILS = {
  alice: 'alice.admin@cashlens-demo.test',
  bruno: 'bruno.comptable@cashlens-demo.test',
  chloe: 'chloe.manager@cashlens-demo.test',
  david: 'david.manager@cashlens-demo.test',
  emma: 'emma.collab@cashlens-demo.test',
  farid: 'farid.collab@cashlens-demo.test',
} as const

export async function loginAs(services: Services, who: keyof typeof EMAILS): Promise<void> {
  await services.auth.login({ email: EMAILS[who], password: 'demo' })
}

/** Fichier en mémoire compatible `UploadedFile`. */
export function memoryFile(name: string, type: string, content: string | Uint8Array): UploadedFile {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
  return {
    name,
    type,
    size: bytes.length,
    arrayBuffer: async () => bytes.slice().buffer,
  }
}

/** Fichier d'exemple de `public/demo/`. */
export function demoFile(name: string, type: string): UploadedFile {
  // Les tests sont lancés depuis frontend/ (racine Vitest).
  const path = resolve(process.cwd(), 'public/demo', name)
  return memoryFile(name, type, new Uint8Array(readFileSync(path)))
}
