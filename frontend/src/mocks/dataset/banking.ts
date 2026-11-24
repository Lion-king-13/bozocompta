import type { Allocation, BankAccount, BankTransaction, Card, Id, ImportBatch, Reconciliation } from '@/domain'

/** Comptes et cartes FICTIFS : IBAN masqués, 4 derniers chiffres inventés. */
export const BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ba-be-1', entityId: 'ent-be', name: 'Compte courant', bankName: 'Banque Fictive Belgique', ibanMasked: 'BE•• •••• •••• 0001', currency: 'EUR' },
  { id: 'ba-fr-1', entityId: 'ent-fr', name: 'Compte principal', bankName: 'Banque Imaginaire France', ibanMasked: 'FR76 •••• •••• •••• •••• •••• 001', currency: 'EUR' },
]

export const CARDS: Card[] = [
  // Alice possède deux cartes, sur deux entités différentes ; chaque carte appartient à UNE entité.
  { id: 'card-be-alice', entityId: 'ent-be', holderUserId: 'usr-alice', label: 'Carte Alice — Belgique', last4: '0412', network: 'visa', status: 'active', monthlyLimitCents: 1_000_000, expiresAt: '2028-09' },
  { id: 'card-fr-alice', entityId: 'ent-fr', holderUserId: 'usr-alice', label: 'Carte Alice — France', last4: '7781', network: 'mastercard', status: 'active', monthlyLimitCents: 500_000, expiresAt: '2028-03' },
  { id: 'card-be-emma', entityId: 'ent-be', holderUserId: 'usr-emma', label: 'Carte Emma — marketing', last4: '0417', network: 'visa', status: 'active', monthlyLimitCents: 150_000, expiresAt: '2027-12' },
  { id: 'card-be-emma-old', entityId: 'ent-be', holderUserId: 'usr-emma', label: 'Ancienne carte Emma', last4: '1166', network: 'visa', status: 'expired', monthlyLimitCents: 150_000, expiresAt: '2026-06' },
  { id: 'card-be-chloe', entityId: 'ent-be', holderUserId: 'usr-chloe', label: 'Carte Chloé — opérations', last4: '2291', network: 'mastercard', status: 'active', monthlyLimitCents: 500_000, expiresAt: '2027-05' },
  { id: 'card-fr-farid', entityId: 'ent-fr', holderUserId: 'usr-farid', label: 'Carte Farid — projets', last4: '7730', network: 'visa', status: 'active', monthlyLimitCents: 100_000, expiresAt: '2027-08' },
  { id: 'card-fr-david', entityId: 'ent-fr', holderUserId: 'usr-david', label: 'Carte David', last4: '5108', network: 'mastercard', status: 'blocked', monthlyLimitCents: 300_000, expiresAt: '2027-02' },
]

export const IMPORT_BATCHES: ImportBatch[] = [
  { id: 'batch-be-1', entityId: 'ent-be', bankAccountId: 'ba-be-1', fileName: 'releve-be-2026-11.csv', importedAt: '2026-11-19T08:00:00Z', importedByUserId: 'usr-bruno', rowCount: 5 },
  { id: 'batch-fr-1', entityId: 'ent-fr', bankAccountId: 'ba-fr-1', fileName: 'releve-fr-2026-11.csv', importedAt: '2026-11-19T08:05:00Z', importedByUserId: 'usr-bruno', rowCount: 4 },
]

interface TxSeed {
  id: Id
  date: string
  label: string
  counterparty: string
  /** Montant POSITIF en centimes. */
  amount: number
  direction?: BankTransaction['direction']
  categoryId?: Id
}

function tx(entityId: Id, bankAccountId: Id, t: TxSeed, origin: { batchId?: Id; cardId?: Id }): BankTransaction {
  return {
    id: t.id,
    entityId,
    bankAccountId,
    bookingDate: t.date,
    label: t.label,
    counterpartyName: t.counterparty,
    amountCents: t.amount,
    direction: t.direction ?? 'debit',
    currency: 'EUR',
    source: origin.cardId ? 'card' : 'csv_import',
    cardId: origin.cardId ?? null,
    categoryId: t.categoryId ?? null,
    // Catégories proposées par l'IA, validées par un humain puis enregistrées (démo).
    categoryProvenance: t.categoryId ? 'recorded' : null,
    importBatchId: origin.batchId ?? null,
  }
}

const be = (t: TxSeed, cardId?: Id) => tx('ent-be', 'ba-be-1', t, cardId ? { cardId } : { batchId: 'batch-be-1' })
const fr = (t: TxSeed, cardId?: Id) => tx('ent-fr', 'ba-fr-1', t, cardId ? { cardId } : { batchId: 'batch-fr-1' })

/** Transactions = unités de dépense (débits). Les crédits ne sont jamais des dépenses. */
export const TRANSACTIONS: BankTransaction[] = [
  be({ id: 'tx-be-001', date: '2026-09-01', label: 'VIREMENT CLIENT ALPHA', counterparty: 'Client Alpha SA', amount: 2_500_000, direction: 'credit' }),
  be({ id: 'tx-be-002', date: '2026-10-29', label: 'DOMICILIATION NUAGE HEBERGEMENT NH-2026-0918', counterparty: 'Nuage Hébergement SRL', amount: 60_500, categoryId: 'cat-software' }),
  be({ id: 'tx-be-003', date: '2026-11-03', label: 'VIR BUREAU ET CO 55821', counterparty: 'Bureau & Co', amount: 30_245, categoryId: 'cat-office' }),
  be({ id: 'tx-be-004', date: '2026-11-18', label: 'DOMICILIATION NUAGE HEBERGEMENT', counterparty: 'Nuage Hébergement SRL', amount: 60_500, categoryId: 'cat-software' }),
  be({ id: 'tx-be-005', date: '2026-10-15', label: 'VIREMENT CLIENT BETA', counterparty: 'Client Beta SRL', amount: 1_200_000, direction: 'credit' }),
  // EXEMPLE OBLIGATOIRE : UN paiement de 3 000,00 € par Alice avec la carte de l'entité belge.
  be({ id: 'tx-be-101', date: '2026-09-15', label: 'CB INFOMATERIEL SRL IM-2026-0412', counterparty: 'InfoMatériel SRL', amount: 300_000, categoryId: 'cat-hardware' }, 'card-be-alice'),
  be({ id: 'tx-be-102', date: '2026-11-01', label: 'CB DATAVIZ PRO', counterparty: 'DataViz Pro', amount: 17_545, categoryId: 'cat-software' }, 'card-be-emma'),
  // Sans facture : dépense comptée + justificatif manquant + anomalie IA (ins-001).
  be({ id: 'tx-be-103', date: '2026-11-10', label: 'CB TECHSTORE ONLINE', counterparty: 'TechStore Online', amount: 129_900, categoryId: 'cat-hardware' }, 'card-be-chloe'),
  be({ id: 'tx-be-104', date: '2026-11-12', label: 'CB RESTAURANT LE MIDI', counterparty: 'Restaurant Le Midi', amount: 4_590, categoryId: 'cat-travel' }, 'card-be-emma'),
  fr({ id: 'tx-fr-001', date: '2026-09-02', label: 'VIREMENT CLIENT GAMMA', counterparty: 'Client Gamma SAS', amount: 3_000_000, direction: 'credit' }),
  fr({ id: 'tx-fr-002', date: '2026-10-31', label: 'PRLV TELELINK TL-10-2026-7781', counterparty: 'TéléLink', amount: 25_199, categoryId: 'cat-telecom' }),
  fr({ id: 'tx-fr-003', date: '2026-11-19', label: 'PRLV TELELINK', counterparty: 'TéléLink', amount: 26_399, categoryId: 'cat-telecom' }),
  fr({ id: 'tx-fr-004', date: '2026-11-05', label: 'VIR CABINET DELTA', counterparty: 'Cabinet Juridique Delta', amount: 172_000, categoryId: 'cat-legal' }),
  fr({ id: 'tx-fr-101', date: '2026-11-03', label: 'CB CHARTBOARD', counterparty: 'ChartBoard', amount: 12_000, categoryId: 'cat-software' }, 'card-fr-farid'),
  fr({ id: 'tx-fr-102', date: '2026-11-15', label: 'CB TAXI PARIS', counterparty: 'Taxi Paris', amount: 6_800, categoryId: 'cat-travel' }, 'card-fr-alice'),
]

/**
 * Allocations explicites (sur les TRANSACTIONS). Les autres débits sont imputés
 * implicitement à 100 % à leur entité payeuse. Montants écrits en clair pour être lisibles ;
 * `dataset.spec.ts` vérifie qu'ils correspondent au plus grand reste et somment au montant payé.
 */
const alloc = (id: Id, transactionId: Id, entityId: Id, costCenterId: Id | null, percentBp: number, amountCents: number): Allocation => ({
  id, transactionId, entityId, costCenterId, percentBp, amountCents,
})

export const ALLOCATIONS: Allocation[] = [
  // EXEMPLE OBLIGATOIRE : 3 000 € → Belgique 60 % = 1 800 € ; Projet France 40 % = 1 200 €.
  alloc('alloc-001a', 'tx-be-101', 'ent-be', null, 6000, 180_000),
  alloc('alloc-001b', 'tx-be-101', 'ent-fr', 'cc-fr-paris', 4000, 120_000),
  alloc('alloc-002', 'tx-be-002', 'ent-be', 'cc-be-it', 10_000, 60_500),
  alloc('alloc-004', 'tx-be-004', 'ent-be', 'cc-be-it', 10_000, 60_500),
  alloc('alloc-102', 'tx-be-102', 'ent-be', 'cc-be-mkt', 10_000, 17_545),
  alloc('alloc-103a', 'tx-be-103', 'ent-be', 'cc-be-ops', 7000, 90_930),
  alloc('alloc-103b', 'tx-be-103', 'ent-fr', 'cc-fr-paris', 3000, 38_970),
  alloc('alloc-fr-002', 'tx-fr-002', 'ent-fr', 'cc-fr-ops', 10_000, 25_199),
  alloc('alloc-fr-004a', 'tx-fr-004', 'ent-fr', 'cc-fr-adm', 5000, 86_000),
  alloc('alloc-fr-004b', 'tx-fr-004', 'ent-fr', 'cc-fr-paris', 5000, 86_000),
]

interface RecSeed {
  id: Id
  invoiceId: Id
  transactionId: Id
  status: Reconciliation['status']
  confidenceBp: number | null
  reasons: string[]
  diff?: number
  suggestedAt: string
  decidedAt?: string
}

const rec = (r: RecSeed): Reconciliation => ({
  id: r.id,
  invoiceId: r.invoiceId,
  transactionId: r.transactionId,
  status: r.status,
  origin: r.confidenceBp === null ? 'manual' : 'ai_suggestion',
  confidenceBp: r.confidenceBp,
  matchReasons: r.reasons,
  amountDifferenceCents: r.diff ?? 0,
  suggestedAt: r.suggestedAt,
  decidedAt: r.decidedAt ?? null,
  decidedByUserId: r.decidedAt ? 'usr-bruno' : null,
})

export const RECONCILIATIONS: Reconciliation[] = [
  // Exemple obligatoire : la facture de 3 000 € et le paiement carte d'Alice sont rapprochés.
  rec({ id: 'rec-001', invoiceId: 'inv-001', transactionId: 'tx-be-101', status: 'confirmed', confidenceBp: 9800, reasons: ['Montant identique', 'Référence IM-2026-0412 dans le libellé'], suggestedAt: '2026-09-16T07:00:00Z', decidedAt: '2026-09-16T09:12:00Z' }),
  rec({ id: 'rec-002', invoiceId: 'inv-002', transactionId: 'tx-be-002', status: 'confirmed', confidenceBp: 9600, reasons: ['Montant identique', 'Référence NH-2026-0918 dans le libellé'], suggestedAt: '2026-11-19T08:01:00Z', decidedAt: '2026-11-19T09:00:00Z' }),
  rec({ id: 'rec-003', invoiceId: 'inv-003', transactionId: 'tx-be-003', status: 'confirmed', confidenceBp: null, reasons: ['Rapprochement manuel'], suggestedAt: '2026-11-19T09:05:00Z', decidedAt: '2026-11-19T09:05:00Z' }),
  rec({ id: 'rec-004', invoiceId: 'inv-007', transactionId: 'tx-be-102', status: 'confirmed', confidenceBp: 9900, reasons: ['Montant identique', 'Fournisseur reconnu', 'Même date'], suggestedAt: '2026-11-02T07:00:00Z', decidedAt: '2026-11-02T08:30:00Z' }),
  rec({ id: 'rec-005', invoiceId: 'inv-004', transactionId: 'tx-fr-002', status: 'confirmed', confidenceBp: 9700, reasons: ['Montant identique', 'Référence TL-10-2026-7781 dans le libellé'], suggestedAt: '2026-11-19T08:06:00Z', decidedAt: '2026-11-19T09:10:00Z' }),
  rec({ id: 'rec-006', invoiceId: 'inv-008', transactionId: 'tx-fr-101', status: 'confirmed', confidenceBp: 9500, reasons: ['Montant identique', 'Fournisseur reconnu'], suggestedAt: '2026-11-04T07:00:00Z', decidedAt: '2026-11-04T10:00:00Z' }),
  // Suggestions en attente de décision humaine.
  rec({ id: 'rec-007', invoiceId: 'inv-006', transactionId: 'tx-be-004', status: 'suggested', confidenceBp: 8800, reasons: ['Montant identique', 'Fournisseur récurrent'], suggestedAt: '2026-11-19T08:02:00Z' }),
  rec({ id: 'rec-008', invoiceId: 'inv-011', transactionId: 'tx-fr-003', status: 'suggested', confidenceBp: 9100, reasons: ['Montant identique', 'Fournisseur reconnu'], suggestedAt: '2026-11-19T08:07:00Z' }),
  rec({ id: 'rec-009', invoiceId: 'inv-005', transactionId: 'tx-fr-004', status: 'suggested', confidenceBp: 6200, reasons: ['Fournisseur reconnu', 'Écart de montant de 8,00 €'], diff: -800, suggestedAt: '2026-11-06T07:00:00Z' }),
  rec({ id: 'rec-010', invoiceId: 'inv-013', transactionId: 'tx-fr-004', status: 'rejected', confidenceBp: 4100, reasons: ['Date proche'], diff: 92_000, suggestedAt: '2026-11-06T07:00:00Z', decidedAt: '2026-11-06T10:00:00Z' }),
]
