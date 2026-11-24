import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileDropZone } from '@/components/ui'
import { resetToasts } from '@/composables/useToasts'
import { clearErrorSimulation, setErrorSimulation } from '@/core/errors'
import { mountView } from '@/features/transactions/shared/testing'
import { demoFile } from '@/test/helpers'
import InvoiceDetailView from './InvoiceDetailView.vue'
import InvoiceImportView from './InvoiceImportView.vue'

/** Champ du formulaire retrouvé par son libellé (comme le ferait un utilisateur). */
async function fill(wrapper: VueWrapper, label: string, value: string) {
  const labelEl = wrapper.findAll('label').find(
    (l) =>
      l
        .text()
        .replace(/\*|\(obligatoire\)/g, '')
        .trim() === label,
  )
  if (!labelEl) throw new Error(`Champ introuvable : ${label}`)
  await wrapper.get(`[id="${labelEl.attributes('for')}"]`).setValue(value)
}

async function fillManualInvoice(
  wrapper: VueWrapper,
  number: string,
  supplierId = 'sup-transport',
) {
  await fill(wrapper, 'Fournisseur', supplierId)
  await fill(wrapper, 'N° de facture', number)
  await fill(wrapper, "Date d'émission", '2026-11-10')
  await fill(wrapper, "Date d'échéance", '2026-12-10')
  await fill(wrapper, 'Description (ligne 1)', 'Livraison')
  await fill(wrapper, 'Prix unitaire HT', '100')
}

beforeEach(() => resetToasts())
afterEach(() => clearErrorSimulation())

describe('saisie manuelle d’une facture (QA-18)', () => {
  it('proposée directement quand l’IA est indisponible, puis enregistrée sans IA ni quota', async () => {
    const { wrapper, services } = await mountView(InvoiceImportView, '/app/factures/import')
    setErrorSimulation({ scenario: 'aiUnavailable', scope: 'ai', mode: 'always' })
    wrapper
      .findComponent(FileDropZone)
      .vm.$emit('select', [demoFile('facture-demo.pdf', 'application/pdf')])
    await flushPromises()
    await wrapper.get('[data-testid="manual-entry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="manual-invoice"]').exists()).toBe(true)
    // Aucun badge IA en saisie manuelle.
    expect(wrapper.findAll('[data-testid="field-provenance"]')).toHaveLength(0)

    const usageBefore = await services.aiUsage.getUsageSummary()
    await fillManualInvoice(wrapper, 'MAN-001')
    await wrapper.get('[data-testid="save-manual-invoice"]').trigger('click')
    await flushPromises()

    const created = (await services.invoices.listInvoices({ search: 'MAN-001' })).items
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      status: 'approved',
      provenance: 'validated',
      totalInclVatCents: 12_100,
    })
    expect(await services.aiUsage.getUsageSummary()).toEqual(usageBefore)
    wrapper.unmount()
  })

  it('doublon (même fournisseur, même n°) : confirmation demandée, puis enregistrement explicite (QA-08)', async () => {
    const { wrapper, services } = await mountView(
      InvoiceImportView,
      '/app/factures/import?mode=manuel',
    )
    await fillManualInvoice(wrapper, 'TR-7741')
    await wrapper.get('[data-testid="save-manual-invoice"]').trigger('click')
    await flushPromises()
    expect(
      (await services.invoices.listInvoices({ search: 'TR-7741', pageSize: 50 })).items.filter(
        (i) => i.number === 'TR-7741',
      ),
    ).toHaveLength(1)
    const confirm = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-duplicate"]',
    )
    expect(confirm).not.toBeNull()
    confirm!.click()
    await flushPromises()
    expect(
      (await services.invoices.listInvoices({ search: 'TR-7741', pageSize: 50 })).items.filter(
        (i) => i.number === 'TR-7741',
      ),
    ).toHaveLength(2)
    wrapper.unmount()
  })
})

describe('contestation d’une facture (QA-19) et facture payée (QA-11)', () => {
  it('« Contester » avec un motif facultatif : statut contestée et motif affiché', async () => {
    const { wrapper, services } = await mountView(InvoiceDetailView, '/app/factures/inv-009')
    await wrapper.get('[data-testid="contest-invoice"]').trigger('click')
    const reason = document.body.querySelector<HTMLInputElement>(
      'input[placeholder^="Ex. montant"]',
    )!
    reason.value = 'Livraison facturée deux fois'
    reason.dispatchEvent(new Event('input'))
    document.body.querySelector<HTMLButtonElement>('[data-testid="confirm-contest"]')!.click()
    await flushPromises()
    expect(await services.invoices.getInvoice('inv-009')).toMatchObject({
      status: 'disputed',
      disputeReason: 'Livraison facturée deux fois',
    })
    expect(wrapper.get('[data-testid="invoice-disputed"]').text()).toContain(
      'Livraison facturée deux fois',
    )
    wrapper.unmount()
  })

  it('une facture payée et rapprochée est en lecture seule, avec l’explication', async () => {
    const { wrapper } = await mountView(InvoiceDetailView, '/app/factures/inv-001')
    expect(wrapper.get('[data-testid="invoice-locked"]').text()).toContain('payée')
    expect(wrapper.find('[data-testid="validate-invoice"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contest-invoice"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
