import { flushPromises } from '@vue/test-utils'
import { EMAILS } from '@/test/helpers'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/core/errors'
import { mountView, plainText } from '@/features/transactions/shared/testing'
import AllocationEditorView from './AllocationEditorView.vue'

describe('écran de répartition — exemple obligatoire des 3 000 €', () => {
  it('affiche 1 800 € / 1 200 €, payé par Alice (carte belge), et le rappel « une seule dépense »', async () => {
    const { wrapper } = await mountView(AllocationEditorView, '/app/allocations/tx-be-101')
    const amounts = wrapper
      .findAll('[data-testid="allocation-amount"]')
      .map((w) => plainText(w.text()))
    expect(amounts).toEqual(['1 800,00 €', '1 200,00 €'])
    expect(plainText(wrapper.get('[data-testid="paid-by"]').text())).toContain(
      'Lumen Belgium SRL — Alice Martin',
    )
    expect(plainText(wrapper.get('[data-testid="single-spend-reminder"]').text())).toContain(
      'Une seule dépense de 3 000,00 € : la ventilation ne crée ni dépense supplémentaire ni écriture intersociétés',
    )
    wrapper.unmount()
  })

  it('50 / 50 → 1 500 € / 1 500 €, enregistré, total de l’organisation inchangé', async () => {
    const { wrapper, services } = await mountView(
      AllocationEditorView,
      '/app/allocations/tx-be-101',
    )
    const before = (await services.dashboard.getSummary({ entityId: null })).spend
    const percents = wrapper.findAll('[data-testid="allocation-line"] input[inputmode="decimal"]')
    await percents[0]!.setValue('50')
    await percents[1]!.setValue('50')
    const amounts = wrapper
      .findAll('[data-testid="allocation-amount"]')
      .map((w) => plainText(w.text()))
    expect(amounts).toEqual(['1 500,00 €', '1 500,00 €'])

    await wrapper.get('[data-testid="save-allocation"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="allocation-saved"]').exists()).toBe(true)
    const saved = await services.allocations.listAllocations({ transactionId: 'tx-be-101' })
    expect(saved.map((a) => a.amountCents)).toEqual([150_000, 150_000])

    const after = (await services.dashboard.getSummary({ entityId: null })).spend
    expect(after.imputedTotalCents).toBe(before.imputedTotalCents)
    expect(after.paidTotalCents).toBe(before.paidTotalCents)
    wrapper.unmount()
  })

  it('une somme ≠ 100 % désactive l’enregistrement et dit pourquoi', async () => {
    const { wrapper } = await mountView(AllocationEditorView, '/app/allocations/tx-be-101')
    const percents = wrapper.findAll('[data-testid="allocation-line"] input[inputmode="decimal"]')
    await percents[0]!.setValue('70')
    expect(wrapper.get('[data-testid="save-allocation"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="blocking-reason"]').text()).toMatch(/dépasse 100 %/)
    expect(wrapper.get('[data-testid="allocation-status"]').text()).toContain('Total incorrect')
    wrapper.unmount()
  })

  it('refus du service (cible en double, QA-06) : message affiché, saisie conservée', async () => {
    const { wrapper, services } = await mountView(
      AllocationEditorView,
      '/app/allocations/tx-be-101',
    )
    vi.spyOn(services.allocations, 'replaceAllocations').mockRejectedValueOnce(
      new ApiError({
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Certaines informations sont invalides.',
        details: [{ field: 'allocations', message: 'Cette imputation figure déjà dans la liste.' }],
      }),
    )
    const percents = wrapper.findAll('[data-testid="allocation-line"] input[inputmode="decimal"]')
    await percents[0]!.setValue('50')
    await percents[1]!.setValue('50')
    await wrapper.get('[data-testid="save-allocation"]').trigger('click')
    await flushPromises()
    const alert = wrapper.get('[data-testid="allocation-error"]')
    expect(alert.attributes('data-code')).toBe('VALIDATION_ERROR')
    expect(alert.text()).toContain('figure déjà dans la liste')
    const kept = wrapper.findAll('[data-testid="allocation-line"] input[inputmode="decimal"]')
    expect(kept.map((i) => (i.element as HTMLInputElement).value)).toEqual(['50', '50'])
    // Rien n'a été enregistré : la répartition 60 / 40 est intacte.
    const stored = await services.allocations.listAllocations({ transactionId: 'tx-be-101' })
    expect(stored.map((a) => a.percentBp)).toEqual([6000, 4000])
    wrapper.unmount()
  })

  it('un manager voit la répartition en lecture seule', async () => {
    const { wrapper } = await mountView(
      AllocationEditorView,
      '/app/allocations/tx-be-101',
      EMAILS.chloe,
    )
    expect(wrapper.find('[data-testid="save-allocation"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Lecture seule')
    wrapper.unmount()
  })
})
