import { type Page } from '@playwright/test'

/**
 * Aides communes aux parcours e2e financiers. En mode mock, les données sont réinitialisées
 * à chaque CHARGEMENT de page : les parcours qui enchaînent plusieurs écrans naviguent donc
 * par les liens et boutons de l'application, pas par `page.goto`.
 */
export async function login(page: Page, email = 'alice.admin@cashlens-demo.test') {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill('demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/app/)
}

/** Fichier d'exemple fourni avec la démonstration (Playwright est lancé depuis frontend/). */
export const demoPath = (name: string) => `public/demo/${name}`

/** Texte sans espaces insécables (Intl en insère dans les montants). */
export const plain = (text: string | null) => (text ?? '').replace(/[\s  ]+/g, ' ').trim()
