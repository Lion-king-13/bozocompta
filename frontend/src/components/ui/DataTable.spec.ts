import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataTable from './DataTable.vue'
import type { DataTableColumn } from './types'

interface Row {
  id: string
  supplier: string
  amount: string
}

const columns: DataTableColumn[] = [
  { key: 'supplier', label: 'Fournisseur', sortable: true },
  { key: 'amount', label: 'Montant', numeric: true, hideOnMobile: false },
]
const rows: Row[] = [
  { id: 'a', supplier: 'Dell', amount: '3 000,00 €' },
  { id: 'b', supplier: 'SNCB', amount: '186,40 €' },
]

describe('DataTable', () => {
  it('affiche la légende, les en-têtes et une ligne par élément', () => {
    const wrapper = mount(DataTable<Row>, {
      props: { columns, rows, rowKey: 'id', caption: 'Factures' },
    })
    expect(wrapper.find('caption').text()).toBe('Factures')
    expect(wrapper.findAll('th').map((th) => th.text())).toEqual([
      expect.stringContaining('Fournisseur'),
      'Montant',
    ])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('pose data-label (vue mobile) et aligne les colonnes numériques', () => {
    const wrapper = mount(DataTable<Row>, {
      props: { columns, rows, rowKey: 'id', caption: 'Factures' },
    })
    const cell = wrapper.findAll('tbody tr')[0]!.findAll('td')[1]!
    expect(cell.attributes('data-label')).toBe('Montant')
    expect(cell.classes()).toContain('is-numeric')
  })

  it('expose aria-sort et émet sort avec la direction inverse', async () => {
    const wrapper = mount(DataTable<Row>, {
      props: {
        columns,
        rows,
        rowKey: 'id',
        caption: 'Factures',
        sortKey: 'supplier',
        sortDirection: 'ascending',
      },
    })
    expect(wrapper.find('th').attributes('aria-sort')).toBe('ascending')
    await wrapper.find('th button').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['supplier', 'descending']])
  })

  it('utilise le slot de cellule et le slot vide', () => {
    const filled = mount(DataTable<Row>, {
      props: { columns, rows, rowKey: 'id', caption: 'Factures' },
      slots: { 'cell-supplier': '<strong>{{ params.row.supplier.toUpperCase() }}</strong>' },
    })
    expect(filled.find('tbody strong').text()).toBe('DELL')

    const empty = mount(DataTable<Row>, {
      props: { columns, rows: [], rowKey: 'id', caption: 'Factures' },
      slots: { empty: 'Rien ici' },
    })
    expect(empty.find('.data-table__empty').text()).toBe('Rien ici')
  })
})
