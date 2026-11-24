import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Component } from 'vue'
import { clearErrorSimulation } from '@/core/errors'
import { routes } from '@/router/routes'
import { createMockServices, setServices, type Services } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { EMAILS } from '@/test/helpers'
import EntityDashboardView from './views/EntityDashboardView.vue'
import OrganizationDashboardView from './views/OrganizationDashboardView.vue'

/**
 * QA-01 / QA-28 : on monte la VRAIE vue, on lit le nombre AFFICHÉ et le lien RENDU, puis on
 * appelle la liste d'arrivée avec exactement la query de ce lien. Si un lien perd un filtre
 * (ou en émet un sous un mauvais nom), ou si le compteur ne vient pas de la même requête,
 * le test échoue.
 */

// ── Montage d'une vue (services neufs, utilisateur connecté, vrai routeur en mémoire) ──
async function mountDashboardView(
  component: Component,
  path: string,
  who: keyof typeof EMAILS = 'alice',
): Promise<{ wrapper: ReturnType<typeof mount>; services: Services; router: Router }> {
  clearErrorSimulation()
  const services = createMockServices({ latencyMs: 0 })
  setServices(services)
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setSession(await services.auth.login({ email: EMAILS[who], password: 'demo' }))
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  for (let i = 0; i < 5; i++) await flushPromises()
  return { wrapper, services, router }
}

/** Lit la query d'un lien rendu (`href`) sous forme d'objet. */
function hrefQuery(href: string | undefined): Record<string, string> {
  const url = new URL(href ?? '', 'http://localhost')
  return Object.fromEntries(url.searchParams.entries())
}

/** Chemin d'un lien rendu. */
function hrefPath(href: string | undefined): string {
  return new URL(href ?? '', 'http://localhost').pathname
}

/** Texte sans espaces insécables (Intl en insère dans les montants). */
function plain(text: string): string {
  return text.replace(/[\s  ]+/g, ' ').trim()
}

/** Nombre de lignes de la liste d'arrivée, lue avec la query du lien (noms des `XxxQuery`). */
async function arrivalCount(services: Services, href: string | undefined): Promise<number> {
  const path = hrefPath(href)
  const q = hrefQuery(href)
  const entity = q.entityId ? { entityId: q.entityId } : {}
  if (path === '/app/factures')
    return (
      await services.invoices.listInvoices({
        ...entity,
        status: q.status as 'to_review',
        pageSize: 200,
      })
    ).total
  if (path === '/app/rapprochements')
    return (
      await services.reconciliations.listReconciliations({
        ...entity,
        status: q.status as 'suggested',
      })
    ).length
  if (path === '/app/justificatifs-manquants')
    return (await services.transactions.listMissingReceipts(entity)).length
  if (path === '/app/analyses-ia')
    return (await services.aiInsights.listInsights({ ...entity, status: q.status as 'open' }))
      .length
  if (path === '/app/transactions')
    return (
      await services.transactions.listTransactions({
        ...entity,
        direction: q.direction as 'debit',
        bookedFrom: q.bookedFrom,
        bookedTo: q.bookedTo,
        pageSize: 200,
      })
    ).total
  throw new Error(`Liste d'arrivée inattendue : ${path}`)
}

const CASES: { who: keyof typeof EMAILS; paths: string[] }[] = [
  {
    who: 'alice',
    paths: ['/app?periode=mois', '/app', '/app/entites/ent-be', '/app/entites/ent-fr'],
  },
  { who: 'chloe', paths: ['/app', '/app/entites/ent-be'] },
  { who: 'david', paths: ['/app?periode=trimestre', '/app/entites/ent-fr'] },
  { who: 'farid', paths: ['/app'] },
]

describe('tableau de bord monté : nombre affiché = lignes de la liste d’arrivée (QA-01, QA-28)', () => {
  for (const { who, paths } of CASES) {
    for (const path of paths) {
      it(`${who} sur ${path}`, async () => {
        const view = path.includes('/entites/') ? EntityDashboardView : OrganizationDashboardView
        const { wrapper, services } = await mountDashboardView(view, path, who)
        const counters = wrapper
          .findAll('[data-testid^="counter-"]')
          .filter((c) =>
            /^counter-(invoices|reconciliations|missing|insights)$/.test(
              c.attributes('data-testid') ?? '',
            ),
          )
        expect(counters.length).toBeGreaterThan(0)
        for (const c of counters) {
          const shown = Number(c.get('[data-testid="counter-value"]').text())
          expect(shown, `${c.attributes('data-testid')} (${c.attributes('href')})`).toBe(
            await arrivalCount(services, c.attributes('href')),
          )
        }
        // KPI « Dépenses » : « N transaction(s) de débit » = lignes de la liste des transactions.
        const kpi = wrapper.get('[data-testid="kpi-spend"]')
        const n = Number(/(\d+) transaction\(s\) de débit/.exec(plain(kpi.text()))?.[1])
        expect(n).toBe(await arrivalCount(services, kpi.attributes('href')))
        expect(Object.keys(hrefQuery(kpi.attributes('href'))).sort()).toEqual(
          path.includes('/entites/')
            ? ['bookedFrom', 'bookedTo', 'direction', 'entityId']
            : ['bookedFrom', 'bookedTo', 'direction'],
        )
        wrapper.unmount()
      })
    }
  }
})

describe('utilisateur limité : libellés et totaux (QA-03, QA-20)', () => {
  it('manager France : « Toutes mes entités », sans la Belgique, total = son dashboard d’entité', async () => {
    const all = await mountDashboardView(OrganizationDashboardView, '/app', 'david')
    const text = plain(all.wrapper.text())
    expect(all.wrapper.get('h1').text()).toContain('Toutes mes entités')
    expect(text).not.toContain('Organisation consolidée')
    expect(text).not.toContain('compté une seule fois')
    expect(text).not.toContain('Lumen Belgium')
    expect(text).toContain('Total de vos entités')
    const total = all.wrapper.get('[data-testid="spend-total"] .kpi__value').text()
    all.wrapper.unmount()

    const fr = await mountDashboardView(EntityDashboardView, '/app/entites/ent-fr', 'david')
    expect(fr.wrapper.get('[data-testid="entity-imputed"] .kpi__value').text()).toBe(total)
    fr.wrapper.unmount()
  })

  it('manager : un porteur hors de ses entités n’est pas nommé (clé null libellée)', async () => {
    const { wrapper } = await mountDashboardView(OrganizationDashboardView, '/app', 'david')
    const text = plain(wrapper.text())
    // Alice a payé avec sa carte BELGE (hors entités de David) : ni son nom ni cette carte.
    expect(text).not.toContain('Carte Alice — Belgique')
    expect(text).toContain('Hors carte, ou autres porteurs (hors de vos entités)')
    wrapper.unmount()
  })

  it('collaborateur : « Mes dépenses », pas de classement « par collaborateur »', async () => {
    const { wrapper } = await mountDashboardView(OrganizationDashboardView, '/app', 'farid')
    expect(wrapper.get('h1').text()).toBe('Mes dépenses')
    const text = plain(wrapper.text())
    expect(text).not.toContain('Par collaborateur')
    for (const colleague of ['Alice Martin', 'Chloé Dubois', 'Emma Janssens', 'David Moreau'])
      expect(text).not.toContain(colleague)
    wrapper.unmount()
  })

  it('admin : libellés du consolidé d’organisation', async () => {
    const { wrapper } = await mountDashboardView(OrganizationDashboardView, '/app', 'alice')
    const text = plain(wrapper.text())
    expect(text).toContain('Organisation consolidée')
    expect(text).toContain('compté une seule fois')
    expect(wrapper.find('[data-testid="missing-amount"]').text()).toMatch(/€ au total/)
    wrapper.unmount()
  })
})

describe('entité non accessible (QA-16, part dashboards)', () => {
  it('affiche « Accès refusé », sans redirection ni changement de périmètre', async () => {
    const { wrapper, router } = await mountDashboardView(
      EntityDashboardView,
      '/app/entites/ent-fr',
      'chloe',
    )
    expect(wrapper.find('[data-testid="entity-forbidden"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-summary"]').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/app/entites/ent-fr')
    const { useEntityScopeStore } = await import('@/stores/entityScope')
    expect(useEntityScopeStore().selectedEntityId).toBe(null)
    wrapper.unmount()
  })
})
