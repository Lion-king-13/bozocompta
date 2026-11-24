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
import { setServices, type Services } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { EMAILS, createTestServices } from '@/test/helpers'

export async function mountView(
  component: Component,
  path: string,
  who: keyof typeof EMAILS = 'alice',
): Promise<{ wrapper: ReturnType<typeof mount>; services: Services }> {
  const services = createTestServices()
  setServices(services)
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = await services.auth.login({ email: EMAILS[who], password: 'demo' })
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
