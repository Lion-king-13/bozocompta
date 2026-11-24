import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { FileDropZone } from '@/components/ui'
import { mountView } from '../shared/testing'
import { EMAILS, demoFile } from '@/test/helpers'
import TransactionImportView from './TransactionImportView.vue'

async function drop(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) {
  wrapper.findComponent(FileDropZone).vm.$emit('select', [demoFile(name, 'text/csv')])
  await flushPromises()
}

describe('import CSV', () => {
  it('fichier valide : aperçu des 3 lignes, puis import réel sur le compte choisi', async () => {
    const { wrapper, services } = await mountView(
      TransactionImportView,
      '/app/transactions/import',
      EMAILS.bruno,
    )
    const before = (await services.transactions.listTransactions({ pageSize: 200 })).total
    await drop(wrapper, 'transactions-valide.csv')
    expect(wrapper.get('[data-testid="csv-preview-summary"]').text()).toContain(
      '3 ligne(s) valide(s)',
    )
    // L'aperçu n'enregistre rien.
    expect((await services.transactions.listTransactions({ pageSize: 200 })).total).toBe(before)

    await wrapper.get('select').setValue('ba-be-1')
    await wrapper.get('[data-testid="csv-import"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="csv-success"]').text()).toContain(
      '3 transaction(s) importée(s)',
    )
    expect((await services.transactions.listTransactions({ pageSize: 200 })).total).toBe(before + 3)
    wrapper.unmount()
  })

  it('fichier invalide : refusé en entier, chaque ligne en erreur est listée', async () => {
    const { wrapper, services } = await mountView(
      TransactionImportView,
      '/app/transactions/import',
      EMAILS.bruno,
    )
    const before = (await services.transactions.listTransactions({ pageSize: 200 })).total
    await drop(wrapper, 'transactions-invalide.csv')
    const alert = wrapper.get('[data-testid="csv-error"]')
    expect(alert.attributes('data-code')).toBe('INVALID_FILE')
    const lines = wrapper.findAll('[data-testid="csv-error-lines"] li').map((li) => li.text())
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('ligne 2')
    expect(lines[1]).toContain('montant invalide')
    expect(wrapper.find('[data-testid="csv-import"]').exists()).toBe(false)
    expect((await services.transactions.listTransactions({ pageSize: 200 })).total).toBe(before)
    wrapper.unmount()
  })
})
