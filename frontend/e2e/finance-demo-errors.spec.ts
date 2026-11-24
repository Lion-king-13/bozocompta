import { expect, test } from '@playwright/test'
import { demoPath, login } from './finance-helpers'

/**
 * Les quatre erreurs simulées (`?demoError=`), chacune sur un écran financier pertinent.
 * Après l'erreur, chaque test vérifie SANS RECHARGER la page (un rechargement restaurerait
 * le jeu de données et masquerait une corruption) que les données sont intactes (QA-28).
 */

test('1. fichier invalide (simulé) sur l’import CSV : rien n’est importé', async ({ page }) => {
  await login(page, 'bruno.comptable@cashlens-demo.test')
  await page.goto('/app/transactions/import?demoError=invalidFile')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await expect(page.getByTestId('csv-error')).toHaveAttribute('data-code', 'INVALID_FILE')
  await expect(page.getByTestId('csv-error')).toContainText('erreur simulée')
  await page.getByRole('main').getByRole('link', { name: 'Transactions', exact: true }).click()
  await expect(page.getByTestId('result-count')).toContainText('15 transaction(s)')
  await expect(page.getByRole('link', { name: 'CB LIBRAIRIE DU CENTRE' })).toHaveCount(0)
})

test('2. IA indisponible sur l’import PDF : alerte, saisie manuelle proposée, « Réessayer » aboutit, aucune facture créée en route', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/factures/import?demoError=aiUnavailable&demoErrorMode=once')
  await page.locator('input[type="file"]').setInputFiles(demoPath('facture-demo.pdf'))
  const alert = page.getByTestId('import-error')
  await expect(alert).toHaveAttribute('data-code', 'AI_UNAVAILABLE')
  await expect(alert).toContainText('facture-demo.pdf')
  await expect(alert.getByTestId('manual-entry')).toBeVisible()
  await alert.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByTestId('confirm-draft')).toBeVisible()
  // On abandonne le brouillon : la liste n'a pas bougé (13 factures, pas de BC-56010).
  await page.getByRole('main').getByRole('link', { name: 'Factures', exact: true }).click()
  await expect(page.getByTestId('result-count')).toContainText('13 facture(s)')
  await expect(page.getByRole('link', { name: 'BC-56010' })).toHaveCount(0)
})

test('3. quota IA dépassé sur les suggestions de rapprochement : rien n’est modifié', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/rapprochements?demoError=aiQuotaExceeded')
  await expect(page.getByTestId('suggestion-card')).toHaveCount(3)
  await page.getByTestId('run-suggestions').click()
  await expect(page.getByTestId('suggest-error')).toHaveAttribute('data-code', 'AI_QUOTA_EXCEEDED')
  // Le reste de la page fonctionne : la saisie manuelle reste proposée.
  await expect(
    page.getByTestId('suggest-error').getByRole('button', { name: 'Rapprocher manuellement' }),
  ).toBeVisible()
  await expect(page.getByTestId('suggestion-card')).toHaveCount(3)
  await expect(page.getByRole('tab', { name: /Rapprochées/ })).toContainText('6')
})

test('4. API indisponible sur la liste des factures, puis « Réessayer » : données complètes', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/factures?demoError=network&demoErrorMode=once')
  const error = page.getByTestId('api-error').first()
  await expect(error).toHaveAttribute('data-code', 'NETWORK_ERROR')
  await error.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByTestId('result-count')).toContainText('13 facture(s)')
  await expect(page.getByRole('link', { name: 'TR-7741', exact: true })).toBeVisible()
  await expect(page.getByTestId('to-review-count')).toContainText('2')
})
