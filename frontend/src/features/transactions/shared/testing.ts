/**
 * Aide aux tests des ÉCRANS financiers : services mock neufs, utilisateur connecté,
 * Pinia et vrai routeur (historique mémoire) — sans les gardes, inutiles ici.
 * À n'utiliser que dans les fichiers *.spec.ts.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component } from 'vue'
import { routes } from '@/router/routes'
import { clearErrorSimulation } from '@/core/errors'
import { createMockServices, setServices, type Services } from '@/services'
import { useAuthStore } from '@/stores/auth'

export async function mountView(
  component: Component,
  path: string,
  /** E-mail du compte de démo (voir `EMAILS` dans src/test/helpers.ts). */
  email = 'alice.admin@cashlens-demo.test',
): Promise<{ wrapper: ReturnType<typeof mount>; services: Services }> {
  clearErrorSimulation()
  const services = createMockServices({ latencyMs: 0 })
  setServices(services)
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = await services.auth.login({ email, password: 'demo' })
  useAuthStore().setSession(session)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, services }
}

/** Texte sans espaces insécables (Intl en insère dans les montants). */
export function plainText(text: string): string {
  return text.replace(/[\s  ]+/g, ' ').trim()
}
