import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * QA indépendante (Agent 5) — responsive et accessibilité sur TOUTES les routes.
 * - débordement horizontal mesuré à 360, 768 et 1280 px (RWD-01) ;
 * - un seul <h1>, un <main>, titre de document propre à la page (A11Y-04 / A11Y-07) ;
 * - axe-core : aucune violation « serious » ou « critical » (A11Y-01).
 * Captures facultatives : QA_SHOTS=<dossier> npx playwright test qa-responsive
 */

const WIDTHS = [360, 768, 1280] as const
const SHOTS = process.env.QA_SHOTS

const PUBLIC_ROUTES = ['/', '/connexion', '/inscription', '/confidentialite', '/acces-refuse']
const APP_ROUTES = [
  '/app',
  '/app/entites/ent-be',
  '/app/factures',
  '/app/factures/import',
  '/app/factures/inv-001',
  '/app/transactions',
  '/app/transactions/import',
  '/app/transactions/tx-be-101',
  '/app/justificatifs-manquants',
  '/app/rapprochements',
  '/app/allocations',
  '/app/allocations/tx-be-101',
  '/app/cartes',
  '/app/cartes/card-be-alice',
  '/app/collaborateurs',
  '/app/collaborateurs/usr-alice',
  '/app/categories',
  '/app/centres-de-couts',
  '/app/budgets',
  '/app/abonnements',
  '/app/analyses-ia',
  '/app/consommation-ia',
  '/app/parametres',
  '/app/confidentialite',
  '/app/route-inexistante',
]

async function login(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill('alice.admin@cashlens-demo.test')
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/app/)
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  // Les services mock répondent sans latence en e2e ; on attend la fin des squelettes.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 5_000 })
}

async function overflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return (
          r.width > 0 &&
          r.right > window.innerWidth + 1 &&
          getComputedStyle(el).position !== 'fixed'
        )
      })
      .filter((el) => !el.closest('[class*="table"], .scope-nav, [style*="overflow"]'))
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`)
    return { scroll: doc.scrollWidth, inner: window.innerWidth, offenders }
  })
}

const slug = (p: string) => p.replace(/\W+/g, '_') || 'root'

for (const width of WIDTHS) {
  test.describe(`largeur ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test(`RWD-01 public : aucune page ne déborde horizontalement (${width})`, async ({ page }) => {
      const failures: string[] = []
      for (const path of PUBLIC_ROUTES) {
        await page.goto(path)
        await settle(page)
        const o = await overflow(page)
        if (o.scroll > o.inner)
          failures.push(`${path}: ${o.scroll} > ${o.inner} ${o.offenders.join(' ')}`)
        if (SHOTS)
          await page.screenshot({ path: `${SHOTS}/${width}${slug(path)}.png`, fullPage: true })
      }
      expect(failures).toEqual([])
    })

    test(`RWD-01 application : aucune route ne déborde horizontalement (${width})`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await login(page)
      const failures: string[] = []
      for (const path of APP_ROUTES) {
        await page.goto(path)
        await settle(page)
        const o = await overflow(page)
        if (o.scroll > o.inner)
          failures.push(`${path}: ${o.scroll} > ${o.inner} ${o.offenders.join(' ')}`)
        if (SHOTS)
          await page.screenshot({ path: `${SHOTS}/${width}${slug(path)}.png`, fullPage: true })
      }
      expect(failures).toEqual([])
    })
  })
}

test.describe('accessibilité (1280 px)', () => {
  test('A11Y-04 / A11Y-07 : un seul h1, un main, un titre de document propre à chaque route', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const problems: string[] = []
    const titles = new Map<string, string>()
    const check = async (path: string) => {
      await page.goto(path)
      await settle(page)
      const h1 = await page.locator('h1').count()
      const main = await page.locator('main').count()
      const title = await page.title()
      if (h1 !== 1) problems.push(`${path}: ${h1} h1`)
      if (main !== 1) problems.push(`${path}: ${main} main`)
      if (!/— CashLens$/.test(title) && path !== '/') problems.push(`${path}: titre « ${title} »`)
      titles.set(path, title)
    }
    for (const path of PUBLIC_ROUTES) await check(path)
    await login(page)
    for (const path of APP_ROUTES) await check(path)
    // Titres distincts entre routes de nature différente (une liste ≠ son import ≠ un détail)
    const dup = [...titles.entries()].filter(
      ([p, t], i, all) => all.findIndex(([, t2]) => t2 === t) !== i && !p.includes('entites'),
    )
    expect(problems).toEqual([])
    expect(dup.map(([p, t]) => `${p} → ${t}`)).toEqual([])
  })

  test('A11Y-01 : axe-core sans violation serious/critical sur les pages publiques', async ({
    page,
  }) => {
    const report: string[] = []
    for (const path of PUBLIC_ROUTES) {
      await page.goto(path)
      await settle(page)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      for (const v of violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')))
        report.push(
          `${path} [${v.impact}] ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`,
        )
    }
    expect(report).toEqual([])
  })

  test('A11Y-01 : axe-core sans violation serious/critical sur les écrans de l’application', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await login(page)
    const report: string[] = []
    for (const path of APP_ROUTES) {
      await page.goto(path)
      await settle(page)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      for (const v of violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')))
        report.push(
          `${path} [${v.impact}] ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`,
        )
    }
    expect(report).toEqual([])
  })
})
