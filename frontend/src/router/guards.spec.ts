import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type RouteLocationNormalized } from 'vue-router'
import { hasPermission, type Permission, type Role } from '@/domain'
import { setServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { createTestServices, EMAILS } from '@/test/helpers'
import { installGuards, resolveNavigation, type AuthSnapshot } from './guards'
import './meta'
import { RouteName } from './routeNames'
import { routes } from './routes'

const anonymous: AuthSnapshot = { isAuthenticated: false, can: () => false }
const as = (role: Role): AuthSnapshot => ({
  isAuthenticated: true,
  can: (p: Permission) => hasPermission(role, p),
})

function location(
  path: string,
  meta: RouteLocationNormalized['meta'],
  parentMeta = {},
): RouteLocationNormalized {
  return {
    path,
    fullPath: path,
    meta,
    matched: [{ meta: parentMeta }, { meta }],
  } as unknown as RouteLocationNormalized
}

describe('resolveNavigation (fonction pure)', () => {
  const invoices = location(
    '/app/factures',
    { permission: 'invoices:read' },
    { requiresAuth: true },
  )

  it('laisse passer une page publique', () => {
    expect(resolveNavigation(location('/', {}), anonymous)).toBe(true)
  })

  it('renvoie vers la connexion (avec redirect) sans session', () => {
    expect(resolveNavigation(invoices, anonymous)).toEqual({
      name: RouteName.Login,
      query: { redirect: '/app/factures' },
    })
  })

  it('renvoie vers « Accès refusé » sans la permission', () => {
    expect(resolveNavigation(invoices, as('member'))).toEqual({
      name: RouteName.Forbidden,
      query: { from: '/app/factures' },
    })
  })

  it('laisse passer avec la permission', () => {
    expect(resolveNavigation(invoices, as('finance'))).toBe(true)
  })

  it('renvoie un utilisateur connecté de la page de connexion vers le tableau de bord', () => {
    expect(resolveNavigation(location('/connexion', { guestOnly: true }), as('member'))).toEqual({
      name: RouteName.OrganizationDashboard,
    })
  })
})

describe('garde installée sur le vrai routeur', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setServices(createTestServices())
    sessionStorage.clear()
  })

  function makeRouter() {
    const router = createRouter({ history: createMemoryHistory(), routes })
    installGuards(router)
    return router
  }

  it('protège /app/factures puis y donne accès après connexion', async () => {
    const router = makeRouter()
    await router.push('/app/factures')
    expect(router.currentRoute.value.name).toBe(RouteName.Login)
    expect(router.currentRoute.value.query.redirect).toBe('/app/factures')

    await useAuthStore().login({ email: EMAILS.bruno, password: 'demo' })
    await router.push('/app/factures')
    expect(router.currentRoute.value.name).toBe(RouteName.Invoices)
  })

  it('affiche « Accès refusé » pour un collaborateur sur les factures', async () => {
    const router = makeRouter()
    await useAuthStore().login({ email: EMAILS.emma, password: 'demo' })
    await router.push('/app/factures')
    expect(router.currentRoute.value.name).toBe(RouteName.Forbidden)
    await router.push('/app/cartes')
    expect(router.currentRoute.value.name).toBe(RouteName.Cards)
  })

  it('déclare toutes les routes nommées attendues', () => {
    const router = makeRouter()
    for (const name of Object.values(RouteName)) {
      expect(router.hasRoute(name), name).toBe(true)
    }
  })
})
