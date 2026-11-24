import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mountView } from '@/features/transactions/shared/testing'
import ReconciliationListView from './ReconciliationListView.vue'

describe('rapprochements : décision humaine sans effet sur les dépenses', () => {
  it('confirmer une suggestion la trace (qui, quand) et ne change aucun total', async () => {
    const { wrapper, services } = await mountView(ReconciliationListView, '/app/rapprochements')
    const before = (await services.dashboard.getSummary({ entityId: null })).spend
    const card = wrapper.get('[data-testid="suggestion-card"][data-id="rec-007"]')
    await card.get('[data-testid="confirm-suggestion"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="reconciliation-feedback"]').text()).toContain(
      'confirmé par Alice Martin, le 20/11/2026',
    )
    const rec = (await services.reconciliations.listReconciliations()).find(
      (r) => r.id === 'rec-007',
    )
    expect(rec).toMatchObject({ status: 'confirmed', decidedByUserId: 'usr-alice' })
    expect((await services.dashboard.getSummary({ entityId: null })).spend).toEqual(before)
    expect(wrapper.find('[data-testid="suggestion-card"][data-id="rec-007"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('rejeter une suggestion ne change aucun total non plus', async () => {
    const { wrapper, services } = await mountView(ReconciliationListView, '/app/rapprochements')
    const before = (await services.dashboard.getSummary({ entityId: null })).spend
    await wrapper
      .get('[data-testid="suggestion-card"][data-id="rec-009"] [data-testid="reject-suggestion"]')
      .trigger('click')
    await flushPromises()
    const rec = (await services.reconciliations.listReconciliations()).find(
      (r) => r.id === 'rec-009',
    )
    expect(rec?.status).toBe('rejected')
    expect((await services.dashboard.getSummary({ entityId: null })).spend).toEqual(before)
    wrapper.unmount()
  })
})
