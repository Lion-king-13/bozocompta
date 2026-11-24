import { expect, test, type Page } from '@playwright/test'
import { demoPath, login, plain } from './finance-helpers'

/**
 * QA indépendante (Agent 5) — ce qui casse ENTRE les écrans écrits par des agents différents.
 * Un test qui révèle un défaut réel est marqué `test.fail()` avec l'identifiant du constat
 * (docs/partie-b/AUDIT_QA.md) : il basculera au vert quand le défaut sera corrigé.
 *
 * Rappel : en mode mock, recharger la page restaure le jeu de données. Les parcours qui
 * vérifient l'absence de corruption naviguent donc par l'interface, jamais par `page.goto`.
 */

const euros = (text: string | null) =>
  Number(
    plain(text)
      .replace(/[^\d,-]/g, '')
      .replace(',', '.'),
  )
const valueOf = async (page: Page, testId: string) =>
  euros(await page.getByTestId(testId).locator('.kpi__value').innerText())
const counter = async (page: Page, id: string) =>
  Number(await page.getByTestId(`counter-${id}`).getByTestId('counter-value').innerText())

async function nav(page: Page, name: string) {
  await page.locator('aside.sidebar').getByRole('link', { name, exact: true }).click()
}

// ── QA-01 : liens des compteurs / KPI du tableau de bord → listes financières ──────────────
test.describe('QA-01 — le nombre affiché sur un compteur = le nombre de lignes de la liste d’arrivée', () => {
  for (const email of ['alice.admin', 'chloe.manager', 'david.manager']) {
    test(`justificatifs manquants et rapprochements en attente (${email})`, async ({ page }) => {
      await login(page, `${email}@cashlens-demo.test`)
      await expect(page.getByTestId('counter-missing').getByTestId('counter-value')).toHaveText(
        /\d+/,
      )
      const missing = await counter(page, 'missing')
      const pending = await counter(page, 'reconciliations')
      await page.getByTestId('counter-missing').click()
      await expect(page.locator('tbody tr')).toHaveCount(missing)
      await nav(page, 'Tableau de bord')
      await page.getByTestId('counter-reconciliations').click()
      await expect(page.getByTestId('suggestion-card')).toHaveCount(pending)
    })

    test(`factures à valider : la liste d’arrivée est filtrée sur « À valider » (${email})`, async ({
      page,
    }) => {
      test.fail(true, 'QA-01 : InvoiceListView ignore ?status=to_review')
      await login(page, `${email}@cashlens-demo.test`)
      await expect(page.getByTestId('counter-invoices').getByTestId('counter-value')).toHaveText(
        /\d+/,
      )
      const n = await counter(page, 'invoices')
      await page.getByTestId('counter-invoices').click()
      await expect(page).toHaveURL(/status=to_review/)
      await expect(page.getByLabel('Statut')).toHaveValue('to_review')
      await expect(page.locator('tbody tr')).toHaveCount(Math.max(n, 1))
      if (n === 0) await expect(page.getByText('Aucune facture')).toBeVisible()
    })
  }

  test('KPI « Dépenses totales » → transactions : débits seulement, sur la période du tableau de bord', async ({
    page,
  }) => {
    test.fail(true, 'QA-01 : TransactionListView ignore ?direction=debit&bookedFrom=&bookedTo=')
    await login(page)
    await page.getByRole('combobox', { name: 'Période' }).selectOption('mois')
    await expect(page).toHaveURL(/periode=mois/)
    const hint = plain(await page.getByTestId('spend-total').innerText())
    const count = Number(/(\d+) transaction\(s\) de débit/.exec(hint)?.[1])
    await page.getByTestId('kpi-spend').click()
    await expect(page).toHaveURL(/direction=debit/)
    await expect(page.getByLabel('Sens')).toHaveValue('debit')
    await expect(page.getByText(new RegExp(`${count} transactions?`))).toBeVisible()
  })

  test('lien partagé / nouvel onglet : ?entityId= est appliqué par la liste d’arrivée', async ({
    page,
  }) => {
    test.fail(true, 'QA-01 : MissingReceiptsView ne lit que le store de périmètre, pas la query')
    await login(page)
    await page.goto('/app/entites/ent-fr')
    const n = await counter(page, 'missing')
    // Ouverture directe du lien (nouvel onglet, favori, lien envoyé) : périmètre neuf
    await page.goto('/app')
    await page
      .getByTestId('scope-nav')
      .getByRole('link', { name: 'Organisation consolidée' })
      .click()
    await page.goto('/app/justificatifs-manquants?entityId=ent-fr')
    await expect(page.locator('tbody tr')).toHaveCount(n)
  })
})

test('QA-02 — une analyse IA renvoie vers la transaction concernée (?search=)', async ({
  page,
}) => {
  test.fail(
    true,
    'QA-02 : TransactionListView ignore ?search= (et la recherche ne porte pas sur l’id)',
  )
  await login(page)
  await page.goto('/app/analyses-ia')
  const link = page
    .getByTestId('insight-item')
    .getByRole('link', { name: /transaction/i })
    .first()
  await link.click()
  await expect(page).toHaveURL(/\/app\/transactions\?search=/)
  await expect(page.locator('tbody tr')).toHaveCount(1)
})

// ── QA-12 : erreur simulée « une seule fois » consommée par la coque ───────────────────────
test('QA-12 — ?demoError=network&demoErrorMode=once (sans portée) touche l’écran visé', async ({
  page,
}) => {
  await login(page)
  await page.goto('/app/factures?demoError=network&demoErrorMode=once')
  await expect(page.getByTestId('api-error').first()).toHaveAttribute('data-code', 'NETWORK_ERROR')
})

test('QA-12 — panneau démo, mode « une seule fois » : l’erreur atteint l’action suivante de l’utilisateur', async ({
  page,
}) => {
  await login(page)
  await nav(page, 'Rapprochements')
  await expect(page.getByTestId('suggestion-card').first()).toBeVisible()
  await page.getByRole('button', { name: 'Simuler une erreur' }).first().click()
  await page.getByText('Autres scénarios et options').click()
  await page.getByLabel(/une seule fois/i).check()
  await page.getByTestId('demo-scenario-aiUnavailable').click()
  await page.getByRole('button', { name: 'Fermer le panneau' }).click()
  await page.getByTestId('run-suggestions').click()
  await expect(page.getByTestId('suggest-error')).toHaveAttribute('data-code', 'AI_UNAVAILABLE')
  await page.getByTestId('run-suggestions').click()
  await expect(page.getByTestId('suggest-error')).toHaveCount(0)
})

// ── QA-13 : 403 / 404 d'un utilisateur connecté ─────────────────────────────────────────────
for (const [path, what] of [
  ['/app/factures', '403'],
  ['/app/route-inexistante', '404'],
] as const) {
  test(`QA-13 — ${what} pour un utilisateur connecté : la coque applicative (navigation, périmètre) reste affichée`, async ({
    page,
  }) => {
    await login(page, 'emma.collab@cashlens-demo.test')
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('aside.sidebar')).toBeVisible()
  })
}

// ── Rôles et accès refusés par URL directe (AUTH-05 / AUTH-07) ──────────────────────────────
const FORBIDDEN_BY_ROLE: Record<string, string[]> = {
  'emma.collab': [
    '/app/factures',
    '/app/factures/import',
    '/app/rapprochements',
    '/app/allocations',
    '/app/budgets',
    '/app/collaborateurs',
    '/app/consommation-ia',
    '/app/transactions/import',
  ],
  'chloe.manager': ['/app/factures/import', '/app/transactions/import', '/app/consommation-ia'],
}
for (const [who, paths] of Object.entries(FORBIDDEN_BY_ROLE)) {
  test(`AUTH-05 : ${who} reçoit « Accès refusé » par URL directe`, async ({ page }) => {
    await login(page, `${who}@cashlens-demo.test`)
    for (const path of paths) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/acces-refuse/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accès refusé')
    }
  })
}

test('AUTH-07 : manager Belgique — détail d’une pièce purement française par URL : introuvable, sans fuite', async ({
  page,
}) => {
  await login(page, 'chloe.manager@cashlens-demo.test')
  await page.goto('/app/factures/inv-004')
  await expect(page.getByText(/introuvable/i).first()).toBeVisible()
  await expect(page.getByText('TL-10-2026-7781')).toHaveCount(0)
  await page.goto('/app/transactions/tx-fr-004')
  await expect(page.getByText(/introuvable/i).first()).toBeVisible()
})

test('QA-16 — URL directe vers le dashboard d’une entité non accessible : « Accès refusé » stable (pas de redirection silencieuse)', async ({
  page,
}) => {
  await login(page, 'chloe.manager@cashlens-demo.test')
  await page.goto('/app/entites/ent-fr')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  expect(new URL(page.url()).pathname).toBe('/app/entites/ent-fr')
  await expect(page.getByTestId('entity-forbidden')).toBeVisible()
})

async function expireSession(page: Page) {
  await page.getByRole('button', { name: 'Simuler une erreur' }).first().click()
  await page.getByText('Autres scénarios et options').click()
  await page.getByTestId('demo-scenario').selectOption('unauthorized')
  await page.getByRole('button', { name: 'Activer', exact: true }).click()
  await page.getByRole('button', { name: 'Fermer le panneau' }).click()
}
async function relogin(page: Page) {
  await page.getByLabel('E-mail').fill('alice.admin@cashlens-demo.test')
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test('AUTH-08 : session expirée simulée pendant la navigation → connexion puis retour à la page', async ({
  page,
}) => {
  await login(page)
  await nav(page, 'Factures')
  await expireSession(page)
  await nav(page, 'Transactions')
  await expect(page).toHaveURL(/\/connexion\?redirect=/)
  await expect(page.getByText(/session/i).first()).toBeVisible()
  await page.getByRole('button', { name: 'Désactiver', exact: true }).first().click()
  await relogin(page)
  await expect.poll(() => new URL(page.url()).pathname).toBe('/app/transactions')
})

test('QA-15 — après « session expirée » simulée, se reconnecter suffit (sans penser à désactiver la simulation)', async ({
  page,
}) => {
  await login(page)
  await expireSession(page)
  await nav(page, 'Transactions')
  await expect(page).toHaveURL(/\/connexion/)
  await relogin(page)
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 3_000 })
    .toBe('/app/transactions')
})

// ── Parcours de démonstration complet, sans rechargement, avec interception réseau ─────────
test('parcours complet : import PDF → validation → rapprochement → 60/40 → 50/50 → import CSV ; chiffres cohérents, aucun appel réseau sortant', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90_000)
  const external: string[] = []
  const apiCalls: string[] = []
  page.on('request', (req) => {
    if (!req.url().startsWith(baseURL!)) external.push(req.url())
    if (['fetch', 'xhr'].includes(req.resourceType()) && !req.url().includes('/demo/'))
      apiCalls.push(req.url())
  })

  await login(page)
  await expect(page.getByTestId('dashboard-summary')).toBeVisible()
  const total0 = await valueOf(page, 'spend-total')
  const missing0 = await counter(page, 'missing')
  const toReview0 = await counter(page, 'invoices')
  const scope = page.getByTestId('scope-nav')
  await scope.getByRole('link', { name: 'Lumen Belgium SRL' }).click()
  const be0 = await valueOf(page, 'entity-imputed')
  await scope.getByRole('link', { name: 'Lumen France SAS' }).click()
  const fr0 = await valueOf(page, 'entity-imputed')
  expect(Math.round((be0 + fr0) * 100)).toBe(Math.round(total0 * 100))
  await scope.getByRole('link', { name: 'Organisation consolidée' }).click()

  // 1. Import PDF → correction → validation
  await nav(page, 'Factures')
  await page.getByRole('button', { name: 'Importer une facture' }).click()
  await page.locator('input[type="file"]').setInputFiles(demoPath('facture-demo.pdf'))
  await page.getByLabel('N° de facture').fill('BC-QA-001')
  await page.getByLabel("J'ai vérifié les données extraites").check()
  await page.getByTestId('confirm-draft').click()
  await expect(page.getByTestId('invoice-created')).toBeVisible()
  await nav(page, 'Tableau de bord')
  expect(await valueOf(page, 'spend-total')).toBe(total0) // une facture n'ajoute rien (D1)
  expect(await counter(page, 'invoices')).toBe(toReview0)

  // 2. Rapprochement : confirmation humaine
  await nav(page, 'Rapprochements')
  await page
    .locator('[data-testid="suggestion-card"][data-id="rec-007"]')
    .getByTestId('confirm-suggestion')
    .click()
  await expect(page.getByTestId('reconciliation-feedback')).toBeVisible()
  await nav(page, 'Tableau de bord')
  expect(await valueOf(page, 'spend-total')).toBe(total0)
  await expect(page.getByTestId('counter-missing').getByTestId('counter-value')).toHaveText(
    String(missing0 - 1),
  )

  // 3. Exemple §5 : 60/40 → 50/50
  await nav(page, 'Transactions')
  await page.getByLabel('Recherche').fill('INFOMATERIEL')
  await page.getByRole('link', { name: 'CB INFOMATERIEL SRL IM-2026-0412' }).click()
  await page.getByRole('link', { name: 'Modifier la répartition' }).click()
  await page.getByLabel('Part (ligne 1)').fill('50')
  await page.getByLabel('Part (ligne 2)').fill('50')
  await page.getByTestId('save-allocation').click()
  await expect(page.getByTestId('allocation-saved')).toBeVisible()
  await nav(page, 'Tableau de bord')
  expect(await valueOf(page, 'spend-total')).toBe(total0)
  await page.getByTestId('scope-nav').getByRole('link', { name: 'Lumen Belgium SRL' }).click()
  expect(Math.round((await valueOf(page, 'entity-imputed')) * 100)).toBe(
    Math.round(be0 * 100) - 30_000,
  )
  await page.getByTestId('scope-nav').getByRole('link', { name: 'Lumen France SAS' }).click()
  expect(Math.round((await valueOf(page, 'entity-imputed')) * 100)).toBe(
    Math.round(fr0 * 100) + 30_000,
  )
  await page.getByTestId('scope-nav').getByRole('link', { name: 'Organisation consolidée' }).click()

  // 4. Import CSV (2 débits : 23,90 + 12,50)
  await nav(page, 'Transactions')
  await page
    .getByRole('button', { name: /Importer/ })
    .first()
    .click()
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await page.getByLabel('Compte bancaire de destination').selectOption('ba-be-1')
  await page.getByTestId('csv-import').click()
  await expect(page.getByTestId('csv-success')).toBeVisible()
  await nav(page, 'Tableau de bord')
  expect(Math.round((await valueOf(page, 'spend-total')) * 100)).toBe(
    Math.round(total0 * 100) + 3_640,
  )
  await expect(page.getByTestId('counter-missing').getByTestId('counter-value')).toHaveText(
    String(missing0 - 1 + 2),
  )

  expect(external, 'aucune requête hors de l’application').toEqual([])
  expect(apiCalls, 'aucun appel fetch/xhr en mode mock (hors fichiers de démo)').toEqual([])
})

// ── Les quatre erreurs simulées : message, réessai, et AUCUNE donnée corrompue (sans reload) ─
test('ERR-01…04 via le panneau démo : chaque échec laisse les chiffres intacts, puis l’action réussit', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await login(page)
  const total0 = await valueOf(page, 'spend-total')
  const missing0 = await counter(page, 'missing')

  async function simulate(id: string) {
    await page.getByRole('button', { name: 'Simuler une erreur' }).first().click()
    await page.getByTestId(`demo-scenario-${id}`).click()
    await page.getByRole('button', { name: 'Fermer le panneau' }).click()
  }
  async function stop() {
    // Bouton « Désactiver » du bandeau de démonstration
    await page.getByRole('button', { name: 'Désactiver', exact: true }).first().click()
  }

  // 1. Fichier invalide (CSV)
  await nav(page, 'Transactions')
  await page
    .getByRole('button', { name: /Importer/ })
    .first()
    .click()
  await simulate('invalidFile')
  await page.locator('input[type="file"]').setInputFiles(demoPath('transactions-valide.csv'))
  await expect(page.getByTestId('csv-error')).toHaveAttribute('data-code', 'INVALID_FILE')
  await expect(page.getByTestId('csv-error')).not.toContainText(/undefined|stack|Error:/)
  await stop()

  // 2. IA indisponible (import PDF) puis 3. quota dépassé
  for (const id of ['aiUnavailable', 'aiQuotaExceeded']) {
    await nav(page, 'Factures')
    await page.getByRole('button', { name: 'Importer une facture' }).click()
    await simulate(id)
    await page.locator('input[type="file"]').setInputFiles(demoPath('facture-demo.pdf'))
    await expect(page.getByTestId('import-error')).toHaveAttribute(
      'data-code',
      id === 'aiUnavailable' ? 'AI_UNAVAILABLE' : 'AI_QUOTA_EXCEEDED',
    )
    await stop()
    await page.getByTestId('import-error').getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByTestId('confirm-draft')).toBeVisible()
  }

  // 4. Réseau : ventilation refusée, puis la répartition affichée est l'ancienne
  await nav(page, 'Transactions')
  await page.getByLabel('Recherche').fill('INFOMATERIEL')
  await page.getByRole('link', { name: 'CB INFOMATERIEL SRL IM-2026-0412' }).click()
  await page.getByRole('link', { name: 'Modifier la répartition' }).click()
  await simulate('network')
  await page.getByLabel('Part (ligne 1)').fill('50')
  await page.getByLabel('Part (ligne 2)').fill('50')
  await page.getByTestId('save-allocation').click()
  await expect(page.getByTestId('allocation-error')).toBeVisible()
  await stop()

  // Aucune donnée corrompue : totaux, compteurs et répartition identiques à l'état initial
  await nav(page, 'Tableau de bord')
  expect(await valueOf(page, 'spend-total')).toBe(total0)
  await expect(page.getByTestId('counter-missing').getByTestId('counter-value')).toHaveText(
    String(missing0),
  )
  await nav(page, 'Allocations')
  await expect(page.getByText(/1\s800,00\s€/).first()).toBeVisible()
  // Aucune facture fantôme créée par les extractions en échec
  await nav(page, 'Factures')
  await expect(page.getByRole('link', { name: 'BC-56010' })).toHaveCount(0)
})

// ── Périmètre : synchronisation sélecteur ↔ store ↔ routes ─────────────────────────────────
test('périmètre : sélecteur d’en-tête → dashboard entité → listes → retour au consolidé, sans boucle ni périmètre collé', async ({
  page,
}) => {
  const warnings: string[] = []
  page.on('console', (m) => {
    if (['warning', 'error'].includes(m.type())) warnings.push(m.text())
  })
  await login(page)
  const select = page.locator('aside.sidebar').getByLabel('Périmètre')
  await select.selectOption('ent-be')
  await expect(page).toHaveURL(/\/app\/entites\/ent-be/)
  await nav(page, 'Justificatifs manquants')
  const beRows = (await page.locator('tbody tr').allInnerTexts()).join('|')
  await select.selectOption('ent-fr')
  await expect(page).toHaveURL(/justificatifs-manquants/) // une liste ne saute pas vers un dashboard
  await expect
    .poll(async () => (await page.locator('tbody tr').allInnerTexts()).join('|'))
    .not.toBe(beRows)
  // « Tableau de bord » dans la navigation mène au dashboard du périmètre choisi
  await nav(page, 'Tableau de bord')
  await expect(page).toHaveURL(/\/app\/entites\/ent-fr/)
  await expect(select).toHaveValue('ent-fr')
  // Retour explicite au consolidé
  await select.selectOption({ label: 'Organisation consolidée' })
  await expect(page).toHaveURL(/\/app(\?|$)/)
  await expect(page.getByTestId('spend-total')).toBeVisible()
  // Précédent du navigateur : URL et sélecteur restent d'accord
  await page.goBack()
  const url = page.url()
  const shown = await select.inputValue()
  if (/entites\/ent-fr/.test(url)) expect(shown).toBe('ent-fr')
  else if (/\/app(\?|$)/.test(url)) expect(shown).toBe('__all__')
  expect(warnings.filter((w) => /Vue Router|Maximum recursive|infinite/i.test(w))).toEqual([])
})
