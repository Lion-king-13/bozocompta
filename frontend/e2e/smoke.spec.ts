import { expect, test } from '@playwright/test'

/** Parcours de fumée en mode mock (build de production, latence nulle). */

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test('la landing affiche les deux offres', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sachez qui dépense quoi')
  await expect(page.getByTestId('plan-card')).toHaveCount(2)
})

test('une page protégée renvoie vers la connexion, puis le tableau de bord s’affiche', async ({
  page,
}) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/connexion\?redirect=/)
  await login(page, 'alice.admin@cashlens-demo.test')
  await expect(page.getByTestId('org-name')).toContainText('Groupe Lumen')
  await expect(page.getByTestId('spend-total')).toContainText('€')
  // Deux menus utilisateur dans le DOM (barre latérale desktop + barre mobile) : on lit le premier
  await expect(page.getByTestId('current-user').first()).toContainText('Alice Martin')
})

test('un collaborateur voit « Accès refusé » sur les factures', async ({ page }) => {
  await login(page, 'emma.collab@cashlens-demo.test')
  await expect(page.getByTestId('current-user').first()).toBeVisible()
  await page.goto('/app/factures')
  await expect(page.getByTestId('forbidden')).toBeVisible()
})

test('le mode démo simule « API indisponible » via ?demoError=network', async ({ page }) => {
  await login(page, 'alice.admin@cashlens-demo.test')
  await expect(page.getByTestId('dashboard-summary')).toBeVisible()
  await page.goto('/app?demoError=network')
  await expect(page.getByTestId('api-error').first()).toHaveAttribute('data-code', 'NETWORK_ERROR')
  await page.goto('/app?demoError=off')
  await expect(page.getByTestId('dashboard-summary')).toBeVisible()
})
