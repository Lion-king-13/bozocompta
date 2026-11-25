import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router/routes'
import type { BankTransactionView, Invoice, InvoiceStatus, Reconciliation } from '@/domain'
import ReconciliationCard from './ReconciliationCard.vue'

/** QA-30 : une suggestion sur une facture non validée reste visible, sans bouton de confirmation. */
function mountCard(invoiceId: string, status: InvoiceStatus) {
  const invoice = {
    id: invoiceId,
    number: 'TR-7741',
    issueDate: '2026-11-06',
    totalInclVatCents: 45_980,
    status,
  } as Invoice
  const tx = {
    id: 'tx-be-103',
    label: 'CB TECHSTORE ONLINE',
    bookingDate: '2026-11-10',
    amountCents: 45_980,
    cardId: 'card-be-chloe',
  }
  const reconciliation: Reconciliation = {
    id: 'rec-test',
    invoiceId,
    transactionId: tx.id,
    status: 'suggested',
    origin: 'ai_suggestion',
    confidenceBp: 6000,
    matchReasons: ['Montant identique'],
    amountDifferenceCents: 0,
    suggestedAt: '2026-11-20T09:00:00Z',
    decidedAt: null,
    decidedByUserId: null,
    rejectionReason: null,
  }
  const router = createRouter({ history: createMemoryHistory(), routes })
  return mount(ReconciliationCard, {
    props: {
      reconciliation,
      invoice,
      transaction: tx as BankTransactionView,
      supplierName: 'Transports Rapides',
      cardText: 'carte •••• 2291',
      canDecide: true,
      busy: false,
    },
    global: { plugins: [router] },
  })
}

describe('carte de suggestion de rapprochement', () => {
  it('facture « À vérifier » : « Validez d’abord la facture » remplace la confirmation (QA-30)', () => {
    const wrapper = mountCard('inv-009', 'to_review')
    expect(wrapper.find('[data-testid="confirm-suggestion"]').exists()).toBe(false)
    const link = wrapper.get('[data-testid="validate-first"]')
    expect(link.text()).toBe('Validez d’abord la facture')
    expect(link.attributes('href')).toContain('/app/factures/inv-009')
    // Le rejet reste possible.
    expect(wrapper.find('[data-testid="reject-suggestion"]').exists()).toBe(true)
  })

  it('facture validée : la confirmation est proposée', () => {
    const wrapper = mountCard('inv-006', 'approved')
    expect(wrapper.find('[data-testid="confirm-suggestion"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="validate-first"]').exists()).toBe(false)
  })
})
