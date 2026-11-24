import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { FileDropZone } from '@/components/ui'
import { clearErrorSimulation, setErrorSimulation } from '@/core/errors'
import { mountView } from '@/features/transactions/shared/testing'
import { demoFile } from '@/test/helpers'
import InvoiceImportView from './InvoiceImportView.vue'

async function drop(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) {
  wrapper.findComponent(FileDropZone).vm.$emit('select', [demoFile(name, 'application/pdf')])
  await flushPromises()
}

afterEach(() => clearErrorSimulation())

describe('import PDF', () => {
  it('fichier invalide (faux PDF) : erreur affichée, fichier conservé, rien d’enregistré', async () => {
    const { wrapper, services } = await mountView(InvoiceImportView, '/app/factures/import')
    const before = (await services.invoices.listInvoices({ pageSize: 200 })).total
    await drop(wrapper, 'faux-pdf.pdf')
    const alert = wrapper.get('[data-testid="import-error"]')
    expect(alert.attributes('data-code')).toBe('INVALID_FILE')
    expect(alert.text()).toContain('en-tête %PDF absent')
    expect(alert.text()).toContain('faux-pdf.pdf')
    expect((await services.invoices.listInvoices({ pageSize: 200 })).total).toBe(before)
    wrapper.unmount()
  })

  it('IA indisponible puis « Réessayer » : l’extraction aboutit sans re-déposer le fichier', async () => {
    const { wrapper } = await mountView(InvoiceImportView, '/app/factures/import')
    setErrorSimulation({ scenario: 'aiUnavailable', scope: 'ai', mode: 'once' })
    await drop(wrapper, 'facture-demo.pdf')
    expect(wrapper.get('[data-testid="import-error"]').attributes('data-code')).toBe(
      'AI_UNAVAILABLE',
    )
    await wrapper.get('[data-testid="import-error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="confirm-draft"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('la provenance passe de « extrait par l’IA » à « corrigé », puis la facture est enregistrée', async () => {
    const { wrapper, services } = await mountView(InvoiceImportView, '/app/factures/import')
    await drop(wrapper, 'facture-demo.pdf')

    const numberField = wrapper
      .findAll('input')
      .find((i) => (i.element as HTMLInputElement).value === 'BC-56010')!
    const numberMeta = () =>
      numberField.element
        .closest('.invoice-form__grid > div')!
        .querySelector('[data-testid="field-provenance"]')!
    expect(numberMeta().getAttribute('data-provenance')).toBe('ai_extracted')
    await numberField.setValue('BC-56010-A')
    expect(numberMeta().getAttribute('data-provenance')).toBe('user_corrected')
    expect(numberMeta().textContent).toContain('Valeur extraite : BC-56010')

    // Sans la case « J'ai vérifié », rien n'est enregistré.
    await wrapper.get('[data-testid="confirm-draft"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Cochez la case')

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('[data-testid="confirm-draft"]').trigger('click')
    await flushPromises()
    const list = await services.invoices.listInvoices({ search: 'BC-56010-A' })
    expect(list.items).toHaveLength(1)
    expect(list.items[0]).toMatchObject({ totalInclVatCents: 5_445, status: 'approved' })
    wrapper.unmount()
  })
})
