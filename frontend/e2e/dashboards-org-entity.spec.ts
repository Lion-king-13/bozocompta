import { expect, test, type Page } from '@playwright/test'

/** Tableaux de bord organisation et entité (mode mock, latence nulle). */

async function login(page: Page, email = 'alice.admin@cashlens-demo.test') {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByTestId('dashboard-summary')).toBeVisible()
}

// Intl insère des espaces insécables comme séparateur de milliers : \s les accepte.
const amount = (text: string) => new RegExp(text.replace(' ', '\\s?'))

test('exemple obligatoire : organisation 3 000 €, Belgique 1 800 / 3 000, France 1 200 / 0', async ({
  page,
}) => {
  await login(page)
  // Septembre 2026 ne contient que le paiement de l'exemple (période personnalisée).
  await page.getByRole('combobox', { name: 'Période' }).selectOption('perso')
  await page.getByLabel('Du', { exact: true }).fill('01/09/2026')
  await page.getByLabel('Au', { exact: true }).fill('30/09/2026')
  await page.getByRole('button', { name: 'Appliquer' }).click()
  await expect(page).toHaveURL(/periode=perso&du=2026-09-01&au=2026-09-30/)
  await expect(page.getByTestId('spend-total')).toContainText(amount('3 000,00'))
  await expect(page.getByTestId('consolidated-total')).toContainText(amount('3 000,00'))
  await expect(page.getByTestId('consolidated-total')).toContainText('compté une seule fois')

  const nav = page.getByTestId('scope-nav')
  await nav.getByRole('link', { name: 'Lumen Belgium SRL' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lumen Belgium SRL')
  await expect(page.getByTestId('entity-imputed')).toContainText("Dépenses imputées à l'entité")
  await expect(page.getByTestId('entity-imputed')).toContainText(amount('1 800,00'))
  await expect(page.getByTestId('entity-paid')).toContainText(amount('3 000,00'))

  await nav.getByRole('link', { name: 'Lumen France SAS' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lumen France SAS')
  await expect(page.getByTestId('entity-imputed')).toContainText(amount('1 200,00'))
  await expect(page.getByTestId('entity-paid')).toHaveText(/^0,00\s?€$/)

  // Retour au consolidé : la période est conservée.
  await nav.getByRole('link', { name: 'Organisation consolidée' }).click()
  await expect(page.getByTestId('spend-total')).toContainText(amount('3 000,00'))
})

test('changer de période met à jour les chiffres et l’URL', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('period-description')).toContainText('du 01/01/2026 au 20/11/2026')
  const yearTotal = await page.getByTestId('spend-total').locator('.kpi__value').innerText()

  await page.getByRole('combobox', { name: 'Période' }).selectOption('mois')
  await expect(page).toHaveURL(/periode=mois/)
  await expect(page.getByTestId('period-description')).toContainText('du 01/11/2026 au 20/11/2026')
  await expect(page.getByTestId('spend-total').locator('.kpi__value')).not.toHaveText(yearTotal)
})

test('un compteur « À traiter » mène à la liste correspondante, de même longueur', async ({
  page,
}) => {
  await login(page)
  const counter = page.getByTestId('counter-insights')
  await expect(counter.getByTestId('counter-value')).toHaveText(/\d+/)
  const count = Number(await counter.getByTestId('counter-value').innerText())
  await counter.click()
  await expect(page).toHaveURL(/\/app\/analyses-ia\?status=open/)
  await expect(page.getByTestId('insight-item')).toHaveCount(count)

  await page.goto('/app')
  await page.getByTestId('counter-missing').click()
  await expect(page).toHaveURL(/\/app\/justificatifs-manquants/)

  // Le KPI « Dépenses » émet les noms exacts des champs de BankTransactionQuery (QA-01).
  await page.goto('/app?periode=mois')
  await expect(page.getByTestId('kpi-spend')).toHaveAttribute(
    'href',
    /\/app\/transactions\?direction=debit&bookedFrom=2026-11-01&bookedTo=2026-11-20$/,
  )
})

test('manager France : « Toutes mes entités » = son tableau de bord d’entité, sans la Belgique', async ({
  page,
}) => {
  await login(page, 'david.manager@cashlens-demo.test')
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toContainText('Toutes mes entités')
  await expect(main.getByText('Organisation consolidée')).toHaveCount(0)
  await expect(main.getByText('compté une seule fois')).toHaveCount(0)
  await expect(page.getByTestId('hbar-row').filter({ hasText: 'Lumen Belgium' })).toHaveCount(0)
  const all = await page.getByTestId('spend-total').locator('.kpi__value').innerText()
  await page.getByTestId('scope-nav').getByRole('link', { name: 'Lumen France SAS' }).click()
  await expect(page.getByTestId('entity-imputed').locator('.kpi__value')).toHaveText(all)
})

test('collaborateur : « Mes dépenses », sans classement nominatif des collègues', async ({
  page,
}) => {
  await login(page, 'farid.collab@cashlens-demo.test')
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Mes dépenses')
  await expect(main.getByRole('heading', { name: 'Par collaborateur' })).toHaveCount(0)
  for (const colleague of ['Alice Martin', 'Chloé Dubois', 'Emma Janssens']) {
    await expect(main.getByText(colleague)).toHaveCount(0)
  }
})

test('un manager ne voit que son entité et pas la consommation IA', async ({ page }) => {
  await login(page, 'chloe.manager@cashlens-demo.test')
  const nav = page.getByTestId('scope-nav')
  await expect(nav.getByRole('link')).toHaveCount(2) // consolidé + Belgique
  await page.goto('/app/entites/ent-fr')
  await expect(page.getByTestId('entity-forbidden')).toBeVisible()
  await page.goto('/app/consommation-ia')
  await expect(page.getByTestId('forbidden')).toBeVisible()
})
