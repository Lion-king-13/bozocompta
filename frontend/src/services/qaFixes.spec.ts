/**
 * Tests des corrections de la couche commune après le contre-audit (docs/partie-b/AUDIT_QA.md).
 * Chaque bloc cite l'identifiant du constat.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearErrorSimulation,
  getErrorSimulation,
  scopeMatches,
  setErrorSimulation,
} from '@/core/errors'
import { sumCents } from '@/core/money'
import { suggestMatches } from '@/domain/finance'
import type { InvoiceInput } from '@/domain'
import { SEED } from '@/mocks/dataset'
import { createTestServices, demoFile, loginAs, memoryFile } from '@/test/helpers'
import type { Services } from './index'

let s: Services

const input = (over: Partial<InvoiceInput> = {}): InvoiceInput => ({
  entityId: 'ent-be',
  supplierId: 'sup-bureau',
  categoryId: 'cat-office',
  number: 'MAN-001',
  issueDate: '2026-11-19',
  dueDate: '2026-12-19',
  lines: [{ description: 'Agrafeuses', quantity: 2, unitPriceCents: 1_250, vatRateBp: 2100 }],
  ...over,
})

beforeEach(async () => {
  s = createTestServices()
  await loginAs(s, 'alice')
})

describe('QA-18 — createInvoice (saisie manuelle)', () => {
  it('crée une facture validée, totaux recalculés, sans IA ni consommation de quota', async () => {
    const usage = (await s.aiUsage.getUsageSummary()).totalTokens
    const invoice = await s.invoices.createInvoice(input())
    expect(invoice).toMatchObject({
      status: 'approved',
      provenance: 'validated',
      totalExclVatCents: 2_500,
      vatCents: 525,
      totalInclVatCents: 3_025,
      paidAt: null,
      sourceDocument: null,
    })
    expect(invoice.lines.every((l) => l.provenance === 'validated')).toBe(true)
    expect((await s.aiUsage.getUsageSummary()).totalTokens).toBe(usage)
    expect((await s.invoices.getInvoice(invoice.id)).number).toBe('MAN-001')
  })

  it('fonctionne quand l’IA est indisponible (erreur n°2)', async () => {
    setErrorSimulation({ scenario: 'aiUnavailable', scope: 'ai', mode: 'always' })
    await expect(s.invoices.createInvoice(input())).resolves.toBeDefined()
    clearErrorSimulation()
  })

  it('valide la saisie et les droits', async () => {
    await expect(s.invoices.createInvoice(input({ lines: [] }))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    await expect(
      s.invoices.createInvoice(input({ supplierId: 'sup-inconnu' })),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await loginAs(s, 'chloe')
    await expect(s.invoices.createInvoice(input())).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('QA-08 — doublon de facture (même fournisseur + même numéro)', () => {
  it('refuse en CONFLICT explicite, puis accepte avec allowDuplicate', async () => {
    const error = await s.invoices
      .createInvoice(input({ supplierId: 'sup-transport', number: 'tr-7741' }))
      .catch((e) => e)
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 })
    expect(error.details[0]).toMatchObject({ field: 'number' })
    const forced = await s.invoices.createInvoice(
      input({ supplierId: 'sup-transport', number: 'TR-7741' }),
      { allowDuplicate: true },
    )
    expect(forced.number).toBe('TR-7741')
  })

  it('le second import du PDF de démonstration est signalé à la confirmation', async () => {
    const confirm = async () => {
      const d = await s.invoices.importInvoicePdf(demoFile('facture-demo.pdf', 'application/pdf'))
      return s.invoices.confirmDraft(
        d.id,
        input({ number: d.number.value!, supplierId: d.supplierId.value! }),
      )
    }
    await confirm()
    await expect(confirm()).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await s.invoices.listInvoices({ search: 'BC-56010' })).total).toBe(1)
  })

  it('une correction ne peut pas reprendre le numéro d’une autre facture du fournisseur', async () => {
    const inv = await s.invoices.getInvoice('inv-010') // TR-7741-B, à vérifier
    await expect(
      s.invoices.updateInvoice(inv.id, {
        ...input(),
        supplierId: inv.supplierId,
        number: 'TR-7741',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('QA-19 — contestation de facture et motif de rejet de rapprochement', () => {
  it('rejectInvoice passe à disputed avec un motif facultatif', async () => {
    const inv = await s.invoices.rejectInvoice('inv-010', '  Doublon de TR-7741  ')
    expect(inv).toMatchObject({ status: 'disputed', disputeReason: 'Doublon de TR-7741' })
    const noReason = await s.invoices.rejectInvoice('inv-009')
    expect(noReason.disputeReason).toBeNull()
  })

  it('refuse de contester une facture payée', async () => {
    await expect(s.invoices.rejectInvoice('inv-001')).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('rejectReconciliation enregistre le motif ; la facture reste à payer', async () => {
    const rec = await s.reconciliations.rejectReconciliation('rec-008', 'Pas la bonne période')
    expect(rec).toMatchObject({ status: 'rejected', rejectionReason: 'Pas la bonne période' })
    expect((await s.invoices.getInvoice('inv-011')).status).toBe('approved')
  })
})

describe('QA-11 / QA-14 — effet du rapprochement sur la facture', () => {
  it('confirmer : facture payée à la date de la transaction, plus modifiable', async () => {
    await s.reconciliations.confirmReconciliation('rec-007')
    const inv = await s.invoices.getInvoice('inv-006')
    expect(inv).toMatchObject({ status: 'paid', paidAt: '2026-11-18' })
    await expect(
      s.invoices.updateInvoice(inv.id, {
        ...input(),
        supplierId: inv.supplierId,
        number: inv.number,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('rapprochement manuel : même effet', async () => {
    await s.reconciliations.createManualReconciliation('inv-009', 'tx-be-103')
    expect(await s.invoices.getInvoice('inv-009')).toMatchObject({
      status: 'paid',
      paidAt: '2026-11-10',
    })
  })

  it('jeu initial : chaque facture payée a paidAt = date de sa transaction confirmée', () => {
    for (const inv of SEED.invoices.filter((i) => i.status === 'paid')) {
      const rec = SEED.reconciliations.find(
        (r) => r.invoiceId === inv.id && r.status === 'confirmed',
      )
      const tx = SEED.transactions.find((t) => t.id === rec?.transactionId)
      expect(inv.paidAt, inv.id).toBe(tx?.bookingDate)
    }
    for (const inv of SEED.invoices.filter((i) => i.status !== 'paid'))
      expect(inv.paidAt).toBeNull()
  })
})

describe('QA-07 — doublons à l’import CSV', () => {
  it('ignore les lignes déjà présentes et les compte ; aperçu marqué', async () => {
    await s.transactions.importCsv('ba-be-1', demoFile('transactions-valide.csv', 'text/csv'))
    const csv =
      'date;libelle;contrepartie;montant;sens\n' +
      '2026-11-19;CB LIBRAIRIE DU CENTRE;Librairie du Centre;23,90;debit\n' +
      '2026-11-20;CB NOUVELLE DEPENSE;Magasin;10,00;debit\n'
    const preview = await s.transactions.previewCsv(memoryFile('r.csv', 'text/csv', csv), 'ba-be-1')
    expect(preview.rows.map((r) => r.duplicate)).toEqual([true, false])
    const result = await s.transactions.importCsv('ba-be-1', memoryFile('r.csv', 'text/csv', csv))
    expect(result.transactions).toHaveLength(1)
    expect(result.skippedDuplicates.map((r) => r.line)).toEqual([2])
  })

  it('les doublons ne sont cherchés que sur le même compte', async () => {
    await s.transactions.importCsv('ba-be-1', demoFile('transactions-valide.csv', 'text/csv'))
    const other = await s.transactions.importCsv(
      'ba-fr-1',
      demoFile('transactions-valide.csv', 'text/csv'),
    )
    expect(other.skippedDuplicates).toEqual([])
  })
})

describe('QA-05 — filtre entité « payé par OU imputé à » et imputations exposées', () => {
  it('même résultat pour l’admin et le manager France ; payé et imputé lisibles', async () => {
    const admin = (await s.transactions.listTransactions({ entityId: 'ent-fr', pageSize: 200 }))
      .items
    await loginAs(s, 'david')
    const david = (await s.transactions.listTransactions({ entityId: 'ent-fr', pageSize: 200 }))
      .items
    expect(david.map((t) => t.id)).toEqual(admin.map((t) => t.id))
    const ex = admin.find((t) => t.id === 'tx-be-101')!
    expect(ex.entityId).toBe('ent-be') // payé par
    expect(ex.imputations.map((i) => [i.entityId, i.amountCents, i.implicit])).toEqual([
      ['ent-be', 180_000, false],
      ['ent-fr', 120_000, false],
    ])
    for (const t of admin.filter((t) => t.direction === 'debit'))
      expect(sumCents(t.imputations.map((i) => i.amountCents))).toBe(t.amountCents)
  })

  it('factures et rapprochements suivent la même règle', async () => {
    const inv = await s.invoices.listInvoices({ entityId: 'ent-fr', pageSize: 200 })
    expect(inv.items.some((i) => i.id === 'inv-001')).toBe(true)
    const recs = await s.reconciliations.listReconciliations({ entityId: 'ent-fr' })
    expect(recs.some((r) => r.id === 'rec-001')).toBe(true)
  })

  it('QA-02 (service) : la recherche porte aussi sur l’identifiant', async () => {
    const page = await s.transactions.listTransactions({ search: 'tx-be-103' })
    expect(page.items.map((t) => t.id)).toEqual(['tx-be-103'])
  })
})

describe('QA-20 — dépenses nominatives', () => {
  it('un member ne voit que les transactions de ses cartes et ses propres dépenses', async () => {
    await loginAs(s, 'emma')
    const tx = (await s.transactions.listTransactions({ pageSize: 200 })).items
    const emmaCards = SEED.cards.filter((c) => c.holderUserId === 'usr-emma').map((c) => c.id)
    expect(tx.length).toBeGreaterThan(0)
    expect(tx.every((t) => t.cardId && emmaCards.includes(t.cardId))).toBe(true)
    const { spend } = await s.dashboard.getSummary()
    expect(spend.byUser.map((u) => u.key)).toEqual(['usr-emma'])
    await expect(s.transactions.getTransaction('tx-be-101')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('un manager ne voit pas nominativement un porteur hors de ses entités', async () => {
    await loginAs(s, 'david') // France ; Chloé n'est membre que de la Belgique
    const { spend } = await s.dashboard.getSummary()
    expect(spend.byUser.some((u) => u.key === 'usr-chloe')).toBe(false)
    expect(spend.byCard.some((c) => c.key === 'card-be-chloe')).toBe(false)
    expect(spend.byUser.some((u) => u.key === 'usr-alice')).toBe(true) // Alice est membre de la France
    expect(spend.byUser.some((u) => u.key === null)).toBe(true) // part non nominative
  })

  it('QA-03 : le consolidé d’un manager ne contient que ses entités', async () => {
    await loginAs(s, 'david')
    const all = await s.dashboard.getSummary()
    const fr = await s.dashboard.getSummary({ entityId: 'ent-fr' })
    expect(all.spend.imputedByEntity.map((e) => e.key)).toEqual(['ent-fr'])
    expect(all.spend.imputedTotalCents).toBe(fr.spend.imputedTotalCents)
  })
})

describe('QA-25 / D6 révisé — suggestion à écart faible signalé', () => {
  it('propose une paire à moins de 1 % d’écart si le fournisseur est reconnu, écart explicite', () => {
    const invoices = SEED.invoices.filter((i) => i.id === 'inv-005')
    const transactions = SEED.transactions.filter((t) => t.id === 'tx-fr-004')
    const names = new Map(SEED.suppliers.map((x) => [x.id, x.name]))
    const [c] = suggestMatches(invoices, transactions, [], names)
    expect(c).toMatchObject({
      invoiceId: 'inv-005',
      transactionId: 'tx-fr-004',
      amountDifferenceCents: -800,
    })
    expect(c!.reasons.some((r) => r.startsWith('Écart de montant'))).toBe(true)
    expect(c!.reasons).not.toContain('Montant identique')
  })

  it('ne propose rien au-delà de 1 % ou sans fournisseur reconnu', () => {
    const names = new Map(SEED.suppliers.map((x) => [x.id, x.name]))
    const inv = { ...SEED.invoices.find((i) => i.id === 'inv-005')!, totalInclVatCents: 180_000 }
    const tx = SEED.transactions.find((t) => t.id === 'tx-fr-004')!
    expect(suggestMatches([inv], [tx], [], names)).toEqual([])
    const anonymous = { ...tx, counterpartyName: 'Inconnu', label: 'VIR' }
    expect(
      suggestMatches([SEED.invoices.find((i) => i.id === 'inv-005')!], [anonymous], [], names),
    ).toEqual([])
  })

  it('la suggestion rec-009 du jeu signale son écart explicitement', () => {
    const rec = SEED.reconciliations.find((r) => r.id === 'rec-009')!
    expect(rec.amountDifferenceCents).toBe(-800)
    expect(rec.matchReasons.some((r) => r.startsWith('Écart de montant'))).toBe(true)
  })
})

describe('QA-12 / QA-15 — simulateur et session expirée', () => {
  it('la portée « * » épargne les appels de fond ; une portée explicite les vise', () => {
    expect(scopeMatches('*', 'auth.login')).toBe(false)
    expect(scopeMatches('*', 'organization.listEntities')).toBe(false)
    expect(scopeMatches('*', 'invoices.list')).toBe(true)
    expect(scopeMatches('auth', 'auth.login')).toBe(true)
    expect(scopeMatches('organization.listEntities', 'organization.listEntities')).toBe(true)
  })

  it('« session expirée » : la reconnexion réussit et met fin à la simulation', async () => {
    setErrorSimulation({ scenario: 'unauthorized', scope: '*', mode: 'always' })
    await expect(s.invoices.listInvoices()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await loginAs(s, 'alice')
    expect(getErrorSimulation()).toBeNull()
    await expect(s.invoices.listInvoices()).resolves.toBeDefined()
  })

  it('une autre simulation n’est pas arrêtée par la connexion', async () => {
    setErrorSimulation({ scenario: 'network', scope: 'invoices', mode: 'always' })
    await loginAs(s, 'alice')
    expect(getErrorSimulation()?.scenario).toBe('network')
    clearErrorSimulation()
  })
})

describe('QA-09 / QA-10', () => {
  it('compte supprimé : pseudonymisé, désactivé, références conservées', async () => {
    await loginAs(s, 'emma')
    await s.privacy.requestDeletion('my_account')
    await loginAs(s, 'alice')
    const emma = await s.users.getUser('usr-emma')
    expect(emma).toMatchObject({ firstName: 'Utilisateur', lastName: 'supprimé', active: false })
    expect(emma.email).not.toBe('emma.collab@cashlens-demo.test')
    await expect(loginAs(s, 'emma')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('sa propre fiche reste lisible ; un manager ne lit pas un collègue hors de ses entités', async () => {
    await loginAs(s, 'farid')
    await expect(s.users.getUser('usr-farid')).resolves.toMatchObject({ id: 'usr-farid' })
    await loginAs(s, 'david')
    await expect(s.users.getUser('usr-chloe')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(s.users.getUser('usr-farid')).resolves.toBeDefined()
  })
})
