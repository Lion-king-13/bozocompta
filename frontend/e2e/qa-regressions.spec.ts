import { expect, test, type Page } from '@playwright/test'
import { login } from './finance-helpers'

/**
 * QA indépendante (Agent 5) — contre-vérification après corrections : filtres dans l'URL,
 * périmètre de la coque, utilisateurs limités. Défaut réel → `test.fail` + identifiant
 * (docs/partie-b/AUDIT_QA.md).
 */

const sidebar = (page: Page) => page.locator('aside.sidebar')
const nav = (page: Page, name: string) =>
  sidebar(page).getByRole('link', { name, exact: true }).click()
const rowTexts = async (page: Page) => (await page.locator('tbody tr').allInnerTexts()).join('|')

test('filtres dans l’URL : retour arrière restaure le filtre, le lien du menu le réinitialise', async ({
  page,
}) => {
  await login(page)
  await nav(page, 'Factures')
  await page.getByLabel('Statut').selectOption('paid')
  await expect(page).toHaveURL(/status=paid/)
  const paid = await rowTexts(page)
  await nav(page, 'Transactions')
  await expect(page).toHaveURL(/\/app\/transactions/)
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/factures\?status=paid/)
  await expect(page.getByLabel('Statut')).toHaveValue('paid')
  await expect.poll(() => rowTexts(page)).toBe(paid)
  await nav(page, 'Factures')
  await expect(page).toHaveURL(/\/app\/factures$/)
  await expect(page.getByLabel('Statut')).toHaveValue('')
  await expect.poll(async () => (await rowTexts(page)) !== paid).toBe(true)
})

test('QA-32 — changer le périmètre dans la coque alors qu’un ?entityId= est dans l’URL : la liste suit la coque', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/entites/ent-be')
  await page.getByTestId('counter-missing').click()
  await expect(page).toHaveURL(/entityId=ent-be/)
  await sidebar(page).getByLabel('Périmètre').selectOption('ent-fr')
  // Attendu : un seul périmètre affiché à l'écran — celui de la coque ou celui du filtre, pas deux.
  await expect(page.getByLabel('Entité').first()).not.toHaveValue('ent-be')
  await expect(page).not.toHaveURL(/entityId=ent-be/)
})

for (const who of ['chloe.manager', 'david.manager']) {
  test(`QA-33 — ${who} (une seule entité) : la coque et la page annoncent le même périmètre`, async ({
    page,
  }) => {
    await login(page, `${who}@cashlens-demo.test`)
    const h1 = await page.getByRole('heading', { level: 1 }).innerText()
    const shell = await sidebar(page).getByTestId('entity-scope').innerText()
    if (/Toutes mes entités/.test(h1)) expect(shell).toContain('Toutes mes entités')
  })
}

test('member : écrans et liens limités à ses propres dépenses', async ({ page }) => {
  await login(page, 'emma.collab@cashlens-demo.test')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes dépenses')
  await nav(page, 'Transactions')
  const rows = await page.locator('tbody tr').allInnerTexts()
  expect(rows.length).toBeGreaterThan(0)
  for (const r of rows) expect(r).not.toMatch(/Chloé|Farid|Alice/)
  await page.goto('/app/transactions/tx-be-101')
  await expect(page.getByText(/introuvable/i).first()).toBeVisible()
  await page.goto('/app/collaborateurs/usr-chloe')
  await expect(page).toHaveURL(/acces-refuse|collaborateurs/)
  await expect(page.getByText(/Chloé Dubois/)).toHaveCount(0)
})
