import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetToasts } from '@/composables/useToasts'
import { mountView } from '@/features/transactions/shared/testing'
import ReconciliationListView from './ReconciliationListView.vue'

beforeEach(() => resetToasts())

describe('rapprochements : décision humaine sans effet sur les dépenses', () => {
  it('confirmer une suggestion la trace (qui, quand), passe la facture à « payée » et ne change aucun total', async () => {
    const { wrapper, services } = await mountView(ReconciliationListView, '/app/rapprochements')
    const before = (await services.dashboard.getSummary({ entityId: null })).spend
    const card = wrapper.get('[data-testid="suggestion-card"][data-id="rec-007"]')
    await card.get('[data-testid="confirm-suggestion"]').trigger('click')
    await flushPromises()

    const feedback = wrapper.get('[data-testid="reconciliation-feedback"]').text()
    expect(feedback).toContain('confirmé par Alice Martin, le 20/11/2026')
    expect(feedback).toContain('NH-2026-1031 est maintenant payée')
    const rec = (await services.reconciliations.listReconciliations()).find(
      (r) => r.id === 'rec-007',
    )
    expect(rec).toMatchObject({ status: 'confirmed', decidedByUserId: 'usr-alice' })
    expect((await services.invoices.getInvoice('inv-006')).status).toBe('paid')
    expect((await services.dashboard.getSummary({ entityId: null })).spend).toEqual(before)
    expect(wrapper.find('[data-testid="suggestion-card"][data-id="rec-007"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('rejeter une suggestion avec un motif facultatif : motif enregistré, aucun total modifié (QA-19)', async () => {
    const { wrapper, services } = await mountView(ReconciliationListView, '/app/rapprochements')
    const before = (await services.dashboard.getSummary({ entityId: null })).spend
    await wrapper
      .get('[data-testid="suggestion-card"][data-id="rec-009"] [data-testid="reject-suggestion"]')
      .trigger('click')
    await flushPromises()
    const reason = document.body.querySelector<HTMLInputElement>(
      'input[placeholder^="Ex. ce paiement"]',
    )!
    reason.value = 'Autre facture du cabinet'
    reason.dispatchEvent(new Event('input'))
    document.body.querySelector<HTMLButtonElement>('[data-testid="confirm-reject"]')!.click()
    await flushPromises()
    const rec = (await services.reconciliations.listReconciliations()).find(
      (r) => r.id === 'rec-009',
    )
    expect(rec).toMatchObject({ status: 'rejected', rejectionReason: 'Autre facture du cabinet' })
    expect((await services.dashboard.getSummary({ entityId: null })).spend).toEqual(before)
    wrapper.unmount()
  })

  it('une suggestion avec écart de montant l’affiche avant la confirmation (QA-25)', async () => {
    const { wrapper } = await mountView(ReconciliationListView, '/app/rapprochements')
    const card = wrapper.get('[data-testid="suggestion-card"][data-id="rec-009"]')
    expect(card.get('[data-testid="amount-gap"]').text()).toMatch(/Écart de 8,00/)
    expect(card.get('[data-testid="confirm-suggestion"]').text()).toContain('malgré l’écart')
    wrapper.unmount()
  })

  it('?status=confirmed ouvre l’onglet des rapprochements confirmés (QA-01)', async () => {
    const { wrapper } = await mountView(
      ReconciliationListView,
      '/app/rapprochements?status=confirmed',
    )
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('Rapprochées')
    wrapper.unmount()
  })

  it('?transactionId= ouvre le rapprochement manuel avec la transaction présélectionnée (QA-24)', async () => {
    const { wrapper } = await mountView(
      ReconciliationListView,
      '/app/rapprochements?transactionId=tx-be-103',
    )
    const selects = Array.from(
      document.body.querySelectorAll<HTMLSelectElement>('[role="dialog"] select'),
    )
    expect(selects.map((s) => s.value)).toContain('tx-be-103')
    wrapper.unmount()
  })
})
