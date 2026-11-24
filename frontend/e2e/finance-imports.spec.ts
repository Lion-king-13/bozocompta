import { expect, test } from '@playwright/test'
import { demoPath, login } from './finance-helpers'

/** Imports : facture PDF (extraction simulée → correction → validation → liste) et relevés CSV. */

test('import PDF : extraction simulée, correction, validation, la facture apparaît dans la liste', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/factures/import')
  await expect(page.getByText('Extraction simulée en mode démonstration')).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles(demoPath('facture-demo.pdf'))

  const number = page.getByLabel('N° de facture')
  await expect(number).toHaveValue('BC-56010')
  const numberMeta = page
    .locator('.invoice-form__grid > div', { has: number })
    .getByTestId('field-provenance')
  await expect(numberMeta).toHaveAttribute('data-provenance', 'ai_extracted')
  await number.fill('BC-56010-E2E')
  await expect(numberMeta).toHaveAttribute('data-provenance', 'user_corrected')
  await expect(numberMeta).toContainText('Valeur extraite : BC-56010')

  await page.getByLabel("J'ai vérifié les données extraites").check()
  await page.getByTestId('confirm-draft').click()

  await expect(page).toHaveURL(/\/app\/factures\?.*search=BC-56010-E2E/)
  await expect(page.getByTestId('invoice-created')).toContainText('BC-56010-E2E')
  await expect(page.getByLabel('Recherche')).toHaveValue('BC-56010-E2E')
  await expect(page.getByRole('link', { name: 'BC-56010-E2E' })).toBeVisible()
  await expect(page.getByTestId('result-count')).toContainText('1 facture(s)')
})

test('import PDF : un faux PDF est refusé proprement, avec « Réessayer »', async ({ page }) => {
  await login(page)
  await page.goto('/app/factures/import')
  await page.locator('input[type="file"]').setInputFiles(demoPath('faux-pdf.pdf'))
  const alert = page.getByTestId('import-error')
  await expect(alert).toHaveAttribute('data-code', 'INVALID_FILE')
  await expect(alert).toContainText('en-tête %PDF absent')
  await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible()
})

test('import CSV valide : aperçu puis import', async ({ page }) => {
  await login(page, 'bruno.comptable@cashlens-demo.test')
  await page.goto('/app/transactions/import')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await expect(page.getByTestId('csv-preview-summary')).toContainText('3 ligne(s) valide(s)')
  await page.getByLabel('Compte bancaire de destination').selectOption('ba-be-1')
  await page.getByTestId('csv-import').click()
  await expect(page.getByTestId('csv-success')).toContainText('3 transaction(s) importée(s)')
  await page.getByRole('button', { name: 'Voir les transactions' }).click()
  await expect(page.getByRole('link', { name: 'CB LIBRAIRIE DU CENTRE' })).toBeVisible()
})

test('import CSV : réimporter le même fichier signale les doublons et n’importe rien (QA-07)', async ({
  page,
}) => {
  await login(page, 'bruno.comptable@cashlens-demo.test')
  await page.goto('/app/transactions/import')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await page.getByTestId('csv-import').click()
  await expect(page.getByTestId('csv-success')).toContainText('3 transaction(s) importée(s)')
  await page.getByRole('button', { name: 'Importer un autre fichier' }).click()
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await expect(page.getByTestId('csv-duplicates')).toContainText('3 ligne(s)')
  await expect(page.getByTestId('csv-duplicate-badge')).toHaveCount(3)
  await expect(page.getByTestId('csv-import')).toBeDisabled()
  // Sans recharger : la liste compte bien 15 + 3 transactions, pas 21.
  await page.getByRole('main').getByRole('link', { name: 'Transactions', exact: true }).click()
  await expect(page.getByTestId('result-count')).toContainText('18 transaction(s)')
})

test('saisie manuelle depuis la liste des factures, sans IA (QA-18)', async ({ page }) => {
  await login(page)
  await page.goto('/app/factures')
  await page.getByTestId('manual-invoice-link').click()
  await expect(page.getByRole('heading', { name: 'Saisir une facture' })).toBeVisible()
  await page.getByLabel('Fournisseur').selectOption('sup-bureau')
  await page.getByLabel('N° de facture').fill('MAN-E2E-1')
  await page.getByLabel("Date d'émission").fill('2026-11-10')
  await page.getByLabel("Date d'échéance").fill('2026-12-10')
  await page.getByLabel('Description (ligne 1)').fill('Fournitures')
  await page.getByLabel('Prix unitaire HT').fill('20')
  await page.getByTestId('save-manual-invoice').click()
  await expect(page.getByTestId('invoice-created')).toContainText('MAN-E2E-1')
  await expect(page.getByRole('link', { name: 'MAN-E2E-1' })).toBeVisible()
})

test('import CSV invalide : refusé en entier, lignes en erreur listées', async ({ page }) => {
  await login(page, 'bruno.comptable@cashlens-demo.test')
  await page.goto('/app/transactions/import')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-invalide.csv'))
  await expect(page.getByTestId('csv-error')).toHaveAttribute('data-code', 'INVALID_FILE')
  await expect(page.getByTestId('csv-error-lines').locator('li')).toHaveCount(3)
  await expect(page.getByTestId('csv-import')).toHaveCount(0)
})
