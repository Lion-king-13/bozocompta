import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Chromium est préinstallé dans l'environnement de développement cloud (/opt/pw-browsers).
// Si ce binaire n'existe pas (machine perso), Playwright utilise son navigateur
// habituel (installé via `npx playwright install chromium`).
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined

// E2E_PORT permet de lancer plusieurs suites e2e en parallèle (worktrees) sans partager le serveur.
const PORT = Number(process.env.E2E_PORT ?? 4173)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  // Build de production en mode mock (latence nulle) puis `vite preview`.
  webServer: {
    command: `npx vite build --mode e2e && npx vite preview --strictPort --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
