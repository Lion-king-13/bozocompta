import { expect, test, type Page } from '@playwright/test'

/** Budgets, analyses IA (erreurs simulées) et consommation IA (mode mock, latence nulle). */

async function login(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill('alice.admin@cashlens-demo.test')
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByTestId('dashboard-summary')).toBeVisible()
}

test('un budget dépassé est signalé sur le tableau de bord et dans la liste', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('dashboard-budget').first()).toContainText('Dépassé')
  await page.getByTestId('kpi-budgets').click()
  await expect(page).toHaveURL(/\/app\/budgets/)
  const exceeded = page.locator('[data-testid="budget-item"][data-level="exceeded"]')
  await expect(exceeded).toHaveCount(1)
  await expect(exceeded).toContainText('Informatique Belgique')
  await expect(exceeded).toContainText('Budget dépassé')

  // Détail : dépenses imputées qui consomment le budget.
  await exceeded.getByRole('button', { name: 'Voir les dépenses' }).click()
  await expect(page.getByTestId('budget-detail')).toContainText('Total consommé')
})

test('créer puis supprimer un budget', async ({ page }) => {
  await login(page)
  await page.goto('/app/budgets')
  await page.getByTestId('budget-create').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Libellé').fill('Déplacements Belgique')
  await dialog.getByLabel('Montant du budget').fill('40,00')
  await dialog.getByRole('button', { name: 'Créer le budget' }).click()
  const item = page.getByTestId('budget-item').filter({ hasText: 'Déplacements Belgique' })
  await expect(item).toBeVisible()
  await item.getByRole('button', { name: 'Supprimer' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer le budget' }).click()
  await expect(item).toHaveCount(0)
})

test('« Lancer une analyse » : succès simulé puis décision humaine', async ({ page }) => {
  await login(page)
  await page.goto('/app/analyses-ia')
  await page.getByTestId('run-analysis').click()
  await expect(page.getByTestId('analysis-success')).toContainText('Rien n’a été appliqué')
  const first = page.getByTestId('insight-item').first()
  await first.getByTestId('insight-dismiss').click()
  await expect(page.getByTestId('insight-decision').first()).toContainText(
    'Ignorée par Alice Martin',
  )
})

test('« Lancer une analyse » avec ?demoError=aiUnavailable affiche « Service IA indisponible »', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/analyses-ia?demoError=aiUnavailable')
  await expect(page.getByTestId('insight-item').first()).toBeVisible() // lecture toujours possible
  await page.getByTestId('run-analysis').click()
  const error = page.getByTestId('analysis-error')
  await expect(error).toHaveAttribute('data-code', 'AI_UNAVAILABLE')
  await expect(error).toContainText('Service IA indisponible')
})

test('« Lancer une analyse » avec ?demoError=aiQuotaExceeded affiche « Quota IA dépassé »', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/analyses-ia?demoError=aiQuotaExceeded')
  await page.getByTestId('run-analysis').click()
  const error = page.getByTestId('analysis-error')
  await expect(error).toHaveAttribute('data-code', 'AI_QUOTA_EXCEEDED')
  await expect(error).toContainText('Quota IA dépassé')
  await error.getByRole('link', { name: 'Voir la consommation IA' }).click()
  await expect(page).toHaveURL(/\/app\/consommation-ia/)
})

test('la page de consommation IA affiche le quota de l’offre et la mention de simulation', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/consommation-ia')
  await expect(page.getByText('Données simulées, prix indicatifs')).toBeVisible()
  const quota = page.getByTestId('ai-quota')
  await expect(quota).toContainText('Offre Pro')
  await expect(quota.getByRole('progressbar')).toBeVisible()
  await expect(page.getByTestId('ai-tokens')).toContainText('Entrée')
  await page.getByRole('combobox', { name: 'Mois' }).selectOption('2026-10')
  await expect(page).toHaveURL(/mois=2026-10/)
})
