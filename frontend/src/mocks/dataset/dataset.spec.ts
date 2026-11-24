import { describe, expect, it } from 'vitest'
import { FULL_PERCENT_BP, allocateByPercentages, sumCents } from '@/core/money'
import { computeInvoiceTotals } from '@/domain/finance'
import { SEED } from './index'

const byId = <T extends { id: string }>(items: readonly T[], id: string) => items.find((i) => i.id === id)

describe('jeu de données mock : cohérence', () => {
  it('a des identifiants uniques dans chaque collection', () => {
    for (const [name, items] of Object.entries(SEED)) {
      const ids = (items as { id?: string }[]).map((i) => i.id).filter(Boolean)
      expect(new Set(ids).size, name).toBe(ids.length)
    }
  })

  it('a des totaux de facture égaux à la somme exacte des lignes', () => {
    for (const invoice of SEED.invoices) {
      const totals = computeInvoiceTotals(invoice.lines)
      expect(invoice.totalExclVatCents, invoice.id).toBe(totals.totalExclVatCents)
      expect(invoice.vatCents, invoice.id).toBe(totals.vatCents)
      expect(invoice.totalInclVatCents, invoice.id).toBe(invoice.totalExclVatCents + invoice.vatCents)
    }
  })

  it('a des montants positifs et entiers (pas de montants négatifs dans le MVP)', () => {
    for (const t of SEED.transactions) expect(Number.isSafeInteger(t.amountCents) && t.amountCents > 0, t.id).toBe(true)
    for (const i of SEED.invoices) expect(i.totalInclVatCents > 0, i.id).toBe(true)
  })

  it('ventile chaque transaction à exactement 100 % et au centime près (plus grand reste)', () => {
    const byTx = new Map<string, typeof SEED.allocations>()
    for (const a of SEED.allocations) byTx.set(a.transactionId, [...(byTx.get(a.transactionId) ?? []), a])
    expect(byTx.size).toBeGreaterThan(0)
    for (const [txId, allocations] of byTx) {
      const tx = byId(SEED.transactions, txId)
      expect(tx, txId).toBeDefined()
      expect(tx!.direction).toBe('debit')
      expect(sumCents(allocations.map((a) => a.percentBp))).toBe(FULL_PERCENT_BP)
      expect(sumCents(allocations.map((a) => a.amountCents))).toBe(tx!.amountCents)
      expect(allocations.map((a) => a.amountCents)).toEqual(
        allocateByPercentages(tx!.amountCents, allocations.map((a) => a.percentBp)),
      )
    }
  })

  it("cible des centres de coûts appartenant à l'entité imputée", () => {
    for (const a of SEED.allocations) {
      if (!a.costCenterId) continue
      expect(byId(SEED.costCenters, a.costCenterId)?.entityId, a.id).toBe(a.entityId)
    }
  })

  it('respecte les références (cartes, comptes, fournisseurs, catégories)', () => {
    for (const card of SEED.cards) {
      const holder = byId(SEED.users, card.holderUserId)
      expect(holder, card.id).toBeDefined()
      expect(byId(SEED.entities, card.entityId), card.id).toBeDefined()
    }
    for (const t of SEED.transactions) {
      expect(byId(SEED.bankAccounts, t.bankAccountId)?.entityId, t.id).toBe(t.entityId)
      if (t.cardId) expect(byId(SEED.cards, t.cardId)?.entityId, t.id).toBe(t.entityId)
      if (t.categoryId) expect(byId(SEED.categories, t.categoryId), t.id).toBeDefined()
    }
    for (const i of SEED.invoices) {
      expect(byId(SEED.suppliers, i.supplierId), i.id).toBeDefined()
      expect(byId(SEED.entities, i.entityId), i.id).toBeDefined()
    }
  })

  it('rapproche au plus 1 facture ↔ 1 transaction confirmée de chaque côté', () => {
    const confirmed = SEED.reconciliations.filter((r) => r.status === 'confirmed')
    expect(new Set(confirmed.map((r) => r.invoiceId)).size).toBe(confirmed.length)
    expect(new Set(confirmed.map((r) => r.transactionId)).size).toBe(confirmed.length)
    for (const r of SEED.reconciliations) {
      expect(byId(SEED.invoices, r.invoiceId), r.id).toBeDefined()
      expect(byId(SEED.transactions, r.transactionId), r.id).toBeDefined()
      expect(r.status === 'suggested' ? r.decidedAt : 'ok', r.id).toBe(r.status === 'suggested' ? null : 'ok')
    }
  })

  it("permet à un collaborateur d'appartenir à plusieurs entités et d'avoir plusieurs cartes", () => {
    expect(SEED.users.some((u) => u.entityIds.length > 1)).toBe(true)
    const alice = SEED.cards.filter((c) => c.holderUserId === 'usr-alice')
    expect(alice.length).toBeGreaterThan(1)
    expect(new Set(alice.map((c) => c.entityId)).size).toBe(2)
  })
})

describe('exemple métier obligatoire (cahier des charges §5)', () => {
  const invoice = byId(SEED.invoices, 'inv-001')!
  const payment = byId(SEED.transactions, 'tx-be-101')!

  it('contient UNE facture de matériel informatique de 3 000 € TTC', () => {
    expect(invoice.totalInclVatCents).toBe(300_000)
    expect(invoice.categoryId).toBe('cat-hardware')
    expect(invoice.entityId).toBe('ent-be')
  })

  it("contient UN paiement de 3 000 € par Alice avec une carte de l'entité belge", () => {
    expect(payment.amountCents).toBe(300_000)
    expect(payment.direction).toBe('debit')
    const card = byId(SEED.cards, payment.cardId!)!
    expect(card.entityId).toBe('ent-be')
    expect(card.holderUserId).toBe('usr-alice')
    expect(payment.entityId).toBe('ent-be')
  })

  it('rapproche la facture et le paiement (confirmé)', () => {
    const rec = SEED.reconciliations.filter((r) => r.invoiceId === invoice.id)
    expect(rec).toHaveLength(1)
    expect(rec[0]).toMatchObject({ transactionId: payment.id, status: 'confirmed' })
  })

  it('ventile 60 % Belgique = 1 800 € et 40 % Projet France = 1 200 €', () => {
    const allocations = SEED.allocations.filter((a) => a.transactionId === payment.id)
    expect(allocations.map((a) => [a.entityId, a.percentBp, a.amountCents])).toEqual([
      ['ent-be', 6000, 180_000],
      ['ent-fr', 4000, 120_000],
    ])
    const project = byId(SEED.costCenters, allocations[1]!.costCenterId!)!
    expect(project).toMatchObject({ type: 'project', entityId: 'ent-fr' })
    expect(sumCents(allocations.map((a) => a.amountCents))).toBe(payment.amountCents)
  })
})
