import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Partie publique et coque applicative (mode mock, build de production).
 * Landing (2 offres), connexion par rôle, navigation filtrée, panneau « mode démo »,
 * accès refusé, 404 et absence de défilement horizontal sur mobile (375 px).
 */

const ROLES = [
  { role: 'admin', label: 'Administrateur' },
  { role: 'finance', label: 'Finance (comptable)' },
  { role: 'manager', label: "Manager d'entité" },
  { role: 'member', label: 'Collaborateur' },
] as const

async function loginAs(page: Page, role: (typeof ROLES)[number]['role']) {
  await page.goto('/connexion')
  await page.getByTestId(`demo-login-${role}`).first().click()
  await expect(page).toHaveURL(/\/app/)
}

/** Menu utilisateur visible (barre latérale en desktop, barre supérieure en mobile). */
const userMenu = (page: Page) => page.locator('[data-testid="current-user"]:visible')

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

test.describe('landing', () => {
  test('présente deux offres lues depuis la configuration, en HT et indicatives', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sachez qui dépense')
    const plans = page.getByTestId('plan-card')
    await expect(plans).toHaveCount(2)
    await expect(plans.nth(0)).toContainText('Essentiel')
    await expect(plans.nth(1)).toContainText('Pro')
    for (const i of [0, 1]) {
      await expect(plans.nth(i)).toContainText('HT / mois')
      await expect(plans.nth(i)).toContainText('Tarif indicatif, non contractuel')
    }
    await expect(page.getByText('Mode démonstration').first()).toBeVisible()
  })

  test('les appels à l’action mènent à la connexion et à l’inscription', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('cta-demo').click()
    await expect(page).toHaveURL(/\/connexion/)
    await page.goto('/')
    await page.getByRole('link', { name: 'Choisir Pro' }).click()
    await expect(page).toHaveURL(/\/inscription\?plan=plan-pro/)
    await expect(page.getByRole('radio', { name: /Pro/ })).toBeChecked()
  })
})

test.describe('connexion et inscription simulées', () => {
  for (const { role, label } of ROLES) {
    test(`connexion en un clic : ${label}`, async ({ page }) => {
      await loginAs(page, role)
      await expect(userMenu(page)).toContainText(label)
      await userMenu(page).click()
      await page.locator('[data-testid="logout"]:visible').click()
      await expect(page).toHaveURL(/\/$/)
    })
  }

  test('le formulaire de connexion valide les champs puis signale un mauvais mot de passe', async ({
    page,
  }) => {
    await page.goto('/connexion')
    await expect(page.getByText('Connexion simulée', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Saisissez votre adresse e-mail.')).toBeVisible()
    await page.getByLabel('E-mail').fill('alice.admin@cashlens-demo.test')
    await page.getByLabel('Mot de passe').fill('mauvais')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByTestId('api-error')).toHaveAttribute('data-code', 'UNAUTHENTICATED')
  })

  test('l’inscription simulée exige le consentement puis ouvre une session', async ({ page }) => {
    await page.goto('/inscription')
    await page.getByLabel('Prénom').fill('Nina')
    await page.getByLabel('Nom', { exact: false }).last().fill('Test')
    await page.getByLabel('E-mail professionnel').fill('nina.test@exemple.be')
    await page.getByLabel('Mot de passe').fill('demo1')
    await page.getByRole('button', { name: 'Créer mon compte de démonstration' }).click()
    await expect(page.getByText('Vous devez avoir lu la politique')).toBeVisible()
    await page.getByLabel('J’ai lu la politique de confidentialité').check()
    await page.getByRole('button', { name: 'Créer mon compte de démonstration' }).click()
    await expect(page).toHaveURL(/\/app/)
    await expect(userMenu(page)).toContainText('Nina Test')
  })
})

test.describe('coque applicative', () => {
  test('la navigation est filtrée selon le rôle et l’URL directe mène à « Accès refusé »', async ({
    page,
  }) => {
    await loginAs(page, 'admin')
    await page.getByTestId('nav-invoices').click()
    await expect(page).toHaveURL(/\/app\/factures/)
    await expect(page).toHaveTitle(/Factures — CashLens/)

    await userMenu(page).click()
    await page.locator('[data-testid="logout"]:visible').click()
    await loginAs(page, 'member')
    await expect(page.getByTestId('nav-invoices')).toHaveCount(0)
    await expect(page.getByTestId('nav-cards')).toBeVisible()
    await page.goto('/app/factures')
    await expect(page.getByTestId('forbidden')).toBeVisible()
    await expect(page.getByTestId('forbidden')).toContainText('Collaborateur')
    await expect(page.getByTestId('forbidden')).toContainText('« Factures »')
  })

  test('les quatre erreurs simulables, déclenchées depuis le panneau, ont leur effet sur un écran réel', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'admin')
    const sidebar = page.locator('aside.sidebar')
    // Navigation par l'interface uniquement : un rechargement effacerait la simulation.
    async function activate(id: string, label: string) {
      await page.getByTestId('demo-toggle').click()
      await page.getByTestId(`demo-scenario-${id}`).click()
      await expect(page.getByTestId(`demo-scenario-${id}`)).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('demo-active')).toContainText(label)
    }

    // 1. Fichier invalide → import CSV d'un fichier pourtant valide
    await activate('invalidFile', 'Import d’un fichier invalide')
    await sidebar.getByRole('link', { name: 'Transactions', exact: true }).click()
    await page.getByRole('button', { name: 'Importer un CSV' }).click()
    await page.locator('input[type="file"]').setInputFiles('public/demo/transactions-valide.csv')
    await expect(page.getByTestId('csv-error')).toHaveAttribute('data-code', 'INVALID_FILE')

    // 2. IA indisponible → import PDF : l'extraction échoue
    await activate('aiUnavailable', 'Service IA indisponible')
    await sidebar.getByRole('link', { name: 'Factures', exact: true }).click()
    await page.getByRole('button', { name: 'Importer une facture' }).click()
    await page.locator('input[type="file"]').setInputFiles('public/demo/facture-demo.pdf')
    await expect(page.getByTestId('import-error')).toHaveAttribute('data-code', 'AI_UNAVAILABLE')

    // 3. Quota IA dépassé → lancer une analyse IA
    await activate('aiQuotaExceeded', 'Quota IA dépassé')
    await sidebar.getByRole('link', { name: 'Analyses IA', exact: true }).click()
    await page.getByTestId('run-analysis').click()
    await expect(page.getByTestId('analysis-error')).toHaveAttribute(
      'data-code',
      'AI_QUOTA_EXCEEDED',
    )

    // 4. API indisponible → une liste ne se charge plus, « Réessayer » proposé
    await activate('network', 'API indisponible / erreur réseau')
    await sidebar.getByRole('link', { name: 'Factures', exact: true }).click()
    const error = page.getByTestId('api-error').first()
    await expect(error).toHaveAttribute('data-code', 'NETWORK_ERROR')

    // Désactivation : « Réessayer » recharge la liste
    await page.getByTestId('demo-active').getByRole('button', { name: 'Désactiver' }).click()
    await expect(page.getByTestId('demo-active')).toHaveCount(0)
    await error.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByTestId('api-error')).toHaveCount(0)
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('« une seule fois » : l’erreur touche l’écran visé, pas la coque', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.getByTestId('demo-toggle').click()
    await page.getByText('Autres scénarios et options').click()
    await page.getByLabel('Ne déclencher l’erreur qu’une seule fois').check()
    await page.getByTestId('demo-scenario-network').click()
    await page.keyboard.press('Escape')
    await page.locator('aside.sidebar').getByRole('link', { name: 'Factures', exact: true }).click()
    await expect(page.getByTestId('api-error').first()).toHaveAttribute(
      'data-code',
      'NETWORK_ERROR',
    )
    // Consommée par l'écran : la simulation s'arrête et le bandeau le montre
    await expect(page.getByTestId('demo-active')).toHaveCount(0)
  })

  test('confidentialité : export simulé puis suppression du compte avec confirmation', async ({
    page,
  }) => {
    await loginAs(page, 'member')
    await page.getByTestId('nav-privacy-settings').click()
    await page.getByTestId('export-data').click()
    await expect(page.getByTestId('export-ready')).toContainText('Télécharger')

    await page.getByTestId('delete-account').click()
    const confirm = page.getByTestId('confirm-deletion')
    await expect(confirm).toBeDisabled()
    await page.getByLabel('Pour confirmer, saisissez SUPPRIMER').fill('supprimer')
    await confirm.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('le sélecteur de périmètre ouvre le tableau de bord de l’entité choisie', async ({
    page,
  }) => {
    await loginAs(page, 'admin')
    const scope = page.locator('[data-testid="entity-scope"]:visible select')
    await expect(scope.locator('option')).toHaveCount(3)
    await expect(scope.locator('option').first()).toHaveText('Organisation consolidée')
    await scope.selectOption({ index: 1 })
    await expect(page).toHaveURL(/\/app\/entites\//)
    await scope.selectOption({ index: 0 })
    await expect(page).toHaveURL(/\/app$/)
    // Déconnexion depuis un tableau de bord d'entité : retour à l'accueil
    await scope.selectOption({ index: 1 })
    await userMenu(page).click()
    await page.locator('[data-testid="logout"]:visible').click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('une adresse inconnue affiche la page introuvable', async ({ page }) => {
    await page.goto('/cette-page-n-existe-pas')
    await expect(page.getByTestId('not-found')).toBeVisible()
    await expect(page).toHaveTitle(/Page introuvable/)
  })
})

test.describe('mobile 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('aucun défilement horizontal ; tiroir de navigation au clavier', async ({ page }) => {
    for (const path of ['/', '/connexion', '/inscription', '/confidentialite']) {
      await page.goto(path)
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0)
    }

    await loginAs(page, 'admin')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    const drawer = page.getByRole('dialog', { name: 'Menu de navigation' })
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)

    for (const path of ['/app/parametres', '/app/confidentialite']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('360 px', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test('QA-27 : tous les onglets des rapprochements sont visibles en entier', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/app/rapprochements')
    const list = page.getByRole('tablist').first()
    await expect(list.getByRole('tab')).not.toHaveCount(0)
    expect(await list.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(0)
    for (const tab of await list.getByRole('tab').all()) {
      const box = (await tab.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(360)
    }
    // Navigation clavier inchangée
    await list.getByRole('tab').first().focus()
    await page.keyboard.press('End')
    await expect(list.getByRole('tab').last()).toBeFocused()
  })
})

test.describe('accessibilité à 375 px (axe-core)', () => {
  // Sans animation : axe mesure les contrastes à l'état final, pas pendant un fondu d'ouverture.
  test.use({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })

  async function seriousViolations(page: Page, where: string): Promise<string[]> {
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    return violations
      .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
      .map((v) => `${where} [${v.impact}] ${v.id} ${v.nodes[0]?.target.join(' ')}`)
  }

  test('landing, connexion et coque applicative (menu ouvert et fermé)', async ({ page }) => {
    const report: string[] = []
    for (const path of ['/', '/connexion']) {
      await page.goto(path)
      report.push(...(await seriousViolations(page, path)))
    }
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    report.push(...(await seriousViolations(page, 'menu public ouvert')))

    await loginAs(page, 'admin')
    report.push(...(await seriousViolations(page, '/app')))
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    report.push(...(await seriousViolations(page, 'tiroir de navigation')))
    await page.keyboard.press('Escape')
    await page.getByTestId('demo-toggle').click()
    report.push(...(await seriousViolations(page, 'panneau démo')))
    expect(report).toEqual([])
  })
})
