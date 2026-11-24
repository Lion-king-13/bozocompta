import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseTextField from './BaseTextField.vue'

describe('BaseTextField', () => {
  it('relie libellé, aide et erreur au champ (aria-describedby, aria-invalid)', () => {
    const wrapper = mount(BaseTextField, {
      props: { label: 'Fournisseur', hint: 'Nom légal', error: 'Obligatoire', modelValue: '' },
    })
    const input = wrapper.find('input')
    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-invalid')).toBe('true')
    const described = input.attributes('aria-describedby')!.split(' ')
    expect(described.map((id) => wrapper.find(`#${id}`).text())).toEqual(
      expect.arrayContaining(['Nom légal', expect.stringContaining('Obligatoire')]),
    )
  })

  it('QA-23 : un champ date rappelle la date retenue au format jj/mm/aaaa', async () => {
    const wrapper = mount(BaseTextField, {
      props: { label: 'Date', type: 'date', modelValue: '2026-11-20' },
    })
    const echo = wrapper.get('[data-testid="date-echo"]')
    expect(echo.text()).toBe('Date retenue : 20/11/2026')
    expect(wrapper.find('input').attributes('aria-describedby')).toContain(echo.attributes('id'))
    await wrapper.setProps({ modelValue: '' })
    expect(wrapper.get('[data-testid="date-echo"]').text()).toBe('Format : jj/mm/aaaa')
  })

  it('pas de rappel de date pour un champ texte', () => {
    const wrapper = mount(BaseTextField, { props: { label: 'Nom', modelValue: 'x' } })
    expect(wrapper.find('[data-testid="date-echo"]').exists()).toBe(false)
  })
})
