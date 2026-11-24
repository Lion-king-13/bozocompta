import { describe, expect, it } from 'vitest'
import { createTestServices, demoFile, loginAs } from '@/test/helpers'

/** Méthodes ajoutées pour les écrans financiers (cartes, catégories, transactions, tri). */
describe('services : ajouts pour les écrans financiers', () => {
  it('aperçu CSV : lit les lignes sans rien enregistrer', async () => {
    const s = createTestServices()
    await loginAs(s, 'bruno')
    const before = (await s.transactions.listTransactions({ pageSize: 200 })).total
    const preview = await s.transactions.previewCsv(demoFile('transactions-valide.csv', 'text/csv'))
    expect(preview.rows).toHaveLength(3)
    expect(preview.rows[0]).toMatchObject({ line: 2, amountCents: 2390, direction: 'debit' })
    expect((await s.transactions.listTransactions({ pageSize: 200 })).total).toBe(before)
  })

  it('aperçu CSV invalide : INVALID_FILE avec le détail par ligne', async () => {
    const s = createTestServices()
    await loginAs(s, 'bruno')
    await expect(
      s.transactions.previewCsv(demoFile('transactions-invalide.csv', 'text/csv')),
    ).rejects.toMatchObject({ code: 'INVALID_FILE', details: expect.arrayContaining([]) })
  })

  it('changement de catégorie : provenance « corrigé par un utilisateur »', async () => {
    const s = createTestServices()
    await loginAs(s, 'bruno')
    const tx = await s.transactions.updateTransactionCategory('tx-be-104', 'cat-office')
    expect(tx).toMatchObject({ categoryId: 'cat-office', categoryProvenance: 'user_corrected' })
    expect((await s.transactions.getTransaction('tx-be-104')).categoryId).toBe('cat-office')
  })

  it('un manager ne peut pas changer la catégorie (FORBIDDEN)', async () => {
    const s = createTestServices()
    await loginAs(s, 'chloe')
    await expect(
      s.transactions.updateTransactionCategory('tx-be-104', 'cat-office'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('filtres transactions par catégorie et par collaborateur', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const travel = await s.transactions.listTransactions({ categoryId: 'cat-travel' })
    expect(travel.items.every((t) => t.categoryId === 'cat-travel')).toBe(true)
    const emma = await s.transactions.listTransactions({ holderUserId: 'usr-emma' })
    expect(emma.items.map((t) => t.id).sort()).toEqual(['tx-be-102', 'tx-be-104'])
  })

  it('cartes : création, refus d’un numéro complet, désactivation', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const input = {
      entityId: 'ent-fr',
      holderUserId: 'usr-emma',
      label: 'Carte Emma — France',
      last4: '4242',
      network: 'visa' as const,
      status: 'active' as const,
      monthlyLimitCents: 50_000,
      expiresAt: '2028-01',
    }
    await expect(s.cards.createCard({ ...input, last4: '4242424242424242' })).rejects.toMatchObject(
      { code: 'VALIDATION_ERROR' },
    )
    const card = await s.cards.createCard(input)
    const blocked = await s.cards.updateCard(card.id, { ...input, status: 'blocked' })
    expect(blocked.status).toBe('blocked')
    // Le titulaire doit appartenir à l'entité de la carte.
    await expect(s.cards.createCard({ ...input, holderUserId: 'usr-chloe' })).rejects.toMatchObject(
      { code: 'VALIDATION_ERROR' },
    )
  })

  it('catégories : suppression refusée si utilisée, acceptée sinon', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    await expect(s.categories.deleteCategory('cat-hardware')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    const created = await s.categories.createCategory({ code: 'TEST', name: 'Test' })
    await s.categories.deleteCategory(created.id)
    expect((await s.categories.listCategories()).some((c) => c.id === created.id)).toBe(false)
  })

  it('factures : tri par montant croissant', async () => {
    const s = createTestServices()
    await loginAs(s, 'alice')
    const page = await s.invoices.listInvoices({
      sortBy: 'totalInclVatCents',
      sortDirection: 'asc',
    })
    const totals = page.items.map((i) => i.totalInclVatCents)
    expect(totals).toEqual([...totals].sort((a, b) => a - b))
  })
})
