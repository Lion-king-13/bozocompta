import { expect, test } from '@playwright/test'
import { demoPath, login } from './finance-helpers'

/** Les quatre erreurs simulées (`?demoError=`), chacune sur un écran financier pertinent. */

test('1. fichier invalide (simulé) sur l’import CSV', async ({ page }) => {
  await login(page, 'bruno.comptable@cashlens-demo.test')
  await page.goto('/app/transactions/import?demoError=invalidFile')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await expect(page.getByTestId('csv-error')).toHaveAttribute('data-code', 'INVALID_FILE')
  await expect(page.getByTestId('csv-error')).toContainText('erreur simulée')
})

test('2. IA indisponible sur l’import PDF : alerte, puis « Réessayer » aboutit', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/factures/import?demoError=aiUnavailable&demoErrorMode=once')
  await page.locator('input[type="file"]').setInputFiles(demoPath('facture-demo.pdf'))
  const alert = page.getByTestId('import-error')
  await expect(alert).toHaveAttribute('data-code', 'AI_UNAVAILABLE')
  await expect(alert).toContainText('facture-demo.pdf')
  await alert.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByTestId('confirm-draft')).toBeVisible()
})

test('3. quota IA dépassé sur les suggestions de rapprochement', async ({ page }) => {
  await login(page)
  await page.goto('/app/rapprochements?demoError=aiQuotaExceeded')
  await expect(page.getByTestId('suggestion-card').first()).toBeVisible()
  await page.getByTestId('run-suggestions').click()
  await expect(page.getByTestId('suggest-error')).toHaveAttribute('data-code', 'AI_QUOTA_EXCEEDED')
  // Le reste de la page fonctionne : la saisie manuelle reste proposée.
  await expect(
    page.getByTestId('suggest-error').getByRole('button', { name: 'Rapprocher manuellement' }),
  ).toBeVisible()
})

test('4. API indisponible sur la liste des factures, puis « Réessayer »', async ({ page }) => {
  await login(page)
  await page.goto('/app/factures?demoError=network&demoErrorMode=once&demoErrorScope=invoices')
  const error = page.getByTestId('api-error').first()
  await expect(error).toHaveAttribute('data-code', 'NETWORK_ERROR')
  await error.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByRole('link', { name: 'TR-7741', exact: true })).toBeVisible()
})
