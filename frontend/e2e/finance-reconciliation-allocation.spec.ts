import { expect, test } from '@playwright/test'
import { login, plain } from './finance-helpers'

test('rapprochement : confirmer une suggestion IA la trace (qui, quand)', async ({ page }) => {
  await login(page)
  await page.goto('/app/rapprochements')
  const card = page.locator('[data-testid="suggestion-card"][data-id="rec-007"]')
  await expect(card).toContainText('Score indicatif')
  await card.getByTestId('confirm-suggestion').click()
  await expect(page.getByTestId('reconciliation-feedback')).toContainText(
    'confirmé par Alice Martin, le 20/11/2026',
  )
  await expect(card).toHaveCount(0)
  await page.getByRole('tab', { name: /Rapprochées/ }).click()
  await expect(page.getByRole('cell', { name: 'NH-2026-1031' }).first()).toBeVisible()
})

test('exemple obligatoire : 3 000 € payés par Alice (carte belge) → 60 / 40, puis 50 / 50 sans changer le total', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/transactions')
  await page.getByLabel('Recherche').fill('INFOMATERIEL')
  await page.getByRole('link', { name: 'CB INFOMATERIEL SRL IM-2026-0412' }).click()
  await expect(page.getByTestId('transaction-allocations')).toContainText('Belgique')
  await page.getByRole('link', { name: 'Modifier la répartition' }).click()

  await expect(page.getByTestId('paid-by')).toContainText('Belgique — Alice Martin')
  await expect(page.getByTestId('single-spend-reminder')).toContainText(
    'la ventilation ne crée ni dépense supplémentaire ni écriture intersociétés',
  )
  const amounts = page.getByTestId('allocation-amount')
  await expect(amounts.nth(0)).toHaveText(/1\s800,00\s€/)
  await expect(amounts.nth(1)).toHaveText(/1\s200,00\s€/)
  await expect(page.getByLabel('Centre de coûts (ligne 2)')).toHaveValue('cc-fr-paris')

  const total = page.getByTestId('org-spend-total')
  await expect(total).toContainText('€')
  const before = plain(await total.textContent())

  await page.getByLabel('Part (ligne 1)').fill('50')
  await page.getByLabel('Part (ligne 2)').fill('50')
  await expect(amounts.nth(0)).toHaveText(/1\s500,00\s€/)
  await expect(amounts.nth(1)).toHaveText(/1\s500,00\s€/)
  await page.getByTestId('save-allocation').click()
  await expect(page.getByTestId('allocation-saved')).toBeVisible()
  await expect(total).toHaveText(before)

  // Somme ≠ 100 % : enregistrement impossible, raison affichée.
  await page.getByLabel('Part (ligne 1)').fill('70')
  await expect(page.getByTestId('save-allocation')).toBeDisabled()
  await expect(page.getByTestId('blocking-reason')).toContainText('dépasse 100 %')
})
