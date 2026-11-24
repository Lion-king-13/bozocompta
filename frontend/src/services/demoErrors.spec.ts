import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError, onApiError, setErrorSimulation } from '@/core/errors'
import { createTestServices, demoFile, loginAs, memoryFile } from '@/test/helpers'
import type { Services } from './index'

/** Les quatre erreurs simulables (§8) : déclenchement réel ET simulé, codes stables. */
let services: Services

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(ApiError)
  await expect(promise).rejects.toMatchObject({ code })
}

beforeEach(async () => {
  services = createTestServices()
  await loginAs(services, 'alice')
})

describe('erreur n°1 — import d’un fichier invalide (INVALID_FILE)', () => {
  it('refuse réellement un fichier non PDF, vide ou sans en-tête %PDF', async () => {
    await expectCode(
      services.invoices.importInvoicePdf(memoryFile('note.txt', 'text/plain', 'bonjour')),
      'INVALID_FILE',
    )
    await expectCode(
      services.invoices.importInvoicePdf(memoryFile('vide.pdf', 'application/pdf', '')),
      'INVALID_FILE',
    )
    await expectCode(
      services.invoices.importInvoicePdf(demoFile('faux-pdf.pdf', 'application/pdf')),
      'INVALID_FILE',
    )
  })

  it('refuse le CSV invalide de démonstration avec le détail par ligne, sans rien importer', async () => {
    const before = (await services.transactions.listTransactions({ pageSize: 200 })).total
    const error = await services.transactions
      .importCsv('ba-be-1', demoFile('transactions-invalide.csv', 'text/csv'))
      .catch((e: ApiError) => e)
    expect(error).toMatchObject({ code: 'INVALID_FILE', status: 422 })
    expect((error as ApiError).details.map((d) => d.field)).toEqual([
      'ligne 2',
      'ligne 3',
      'ligne 4',
    ])
    expect((await services.transactions.listTransactions({ pageSize: 200 })).total).toBe(before)
  })

  it('importe le CSV valide de démonstration', async () => {
    const result = await services.transactions.importCsv(
      'ba-be-1',
      demoFile('transactions-valide.csv', 'text/csv'),
    )
    expect(result.transactions).toHaveLength(3)
    expect(result.transactions[0]).toMatchObject({
      amountCents: 2390,
      direction: 'debit',
      categoryId: 'cat-office',
    })
  })

  it('peut être simulée en mode démo sur un fichier pourtant valide', async () => {
    setErrorSimulation({ scenario: 'invalidFile', scope: 'imports', mode: 'once' })
    await expectCode(
      services.invoices.importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf')),
      'INVALID_FILE',
    )
  })
})

describe('erreur n°2 — service IA indisponible (AI_UNAVAILABLE)', () => {
  it('bloque l’extraction IA mais pas la consultation des données', async () => {
    setErrorSimulation({ scenario: 'aiUnavailable', scope: 'ai', mode: 'always' })
    await expectCode(
      services.invoices.importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf')),
      'AI_UNAVAILABLE',
    )
    await expectCode(services.aiInsights.runAnalysis(), 'AI_UNAVAILABLE')
    await expect(services.invoices.listInvoices()).resolves.toBeDefined()
  })
})

describe('erreur n°3 — quota IA dépassé (AI_QUOTA_EXCEEDED)', () => {
  it('est levée réellement quand la consommation du mois atteint le quota de l’offre, sans consommer', async () => {
    const usageBefore = (await services.aiUsage.getUsageSummary()).totalTokens
    // Remplit artificiellement le quota via des extractions successives jusqu'au refus.
    let error: unknown = null
    for (let i = 0; i < 400 && !error; i++) {
      error = await services.invoices
        .importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf'))
        .then(
          () => null,
          (e) => e,
        )
    }
    expect(error).toMatchObject({ code: 'AI_QUOTA_EXCEEDED', status: 429 })
    const summary = await services.aiUsage.getUsageSummary()
    expect(summary.totalTokens).toBeGreaterThan(usageBefore)
    expect(summary.totalTokens).toBeLessThanOrEqual(summary.includedTokens)
  })

  it('peut être simulée en mode démo', async () => {
    setErrorSimulation({ scenario: 'aiQuotaExceeded', scope: 'ai', mode: 'once' })
    const before = (await services.aiUsage.getUsageSummary()).totalTokens
    await expectCode(services.aiInsights.runAnalysis(), 'AI_QUOTA_EXCEEDED')
    // Un appel IA échoué ne consomme pas de quota.
    expect((await services.aiUsage.getUsageSummary()).totalTokens).toBe(before)
  })
})

describe('erreur n°4 — API indisponible / erreur réseau (NETWORK_ERROR)', () => {
  it('fait échouer n’importe quelle opération, puis tout revient à la normale', async () => {
    setErrorSimulation({ scenario: 'network', scope: '*', mode: 'always' })
    await expectCode(services.dashboard.getSummary(), 'NETWORK_ERROR')
    await expectCode(services.cards.listCards(), 'NETWORK_ERROR')
    setErrorSimulation(null)
    await expect(services.cards.listCards()).resolves.not.toHaveLength(0)
  })
})

describe('session expirée et accès refusé', () => {
  it('signale les erreurs au bus global (utilisé pour la déconnexion sur 401)', async () => {
    const seen: string[] = []
    const off = onApiError((e) => seen.push(e.code))
    setErrorSimulation({ scenario: 'unauthorized', scope: '*', mode: 'once' })
    await expectCode(services.invoices.listInvoices(), 'UNAUTHENTICATED')
    off()
    expect(seen).toEqual(['UNAUTHENTICATED'])
  })

  it('renvoie 401 sans session et 403 sans permission', async () => {
    await services.auth.logout()
    await expectCode(services.invoices.listInvoices(), 'UNAUTHENTICATED')
    await loginAs(services, 'emma')
    await expectCode(services.invoices.listInvoices(), 'FORBIDDEN')
  })
})
