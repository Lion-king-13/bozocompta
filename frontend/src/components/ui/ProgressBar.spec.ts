import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProgressBar from './ProgressBar.vue'

function render(value: number, max = 100, extra: Record<string, unknown> = {}) {
  return mount(ProgressBar, { props: { label: 'Budget IT', value, max, ...extra } })
}

describe('ProgressBar', () => {
  it('expose un progressbar avec valeurs et texte complet', () => {
    const bar = render(36, 100, { valueText: '1 800 € sur 5 000 €' }).find('[role="progressbar"]')
    expect(bar.attributes('aria-label')).toBe('Budget IT')
    expect(bar.attributes('aria-valuenow')).toBe('36')
    expect(bar.attributes('aria-valuemax')).toBe('100')
    expect(bar.attributes('aria-valuetext')).toBe('1 800 € sur 5 000 €, 36 %. Dans la limite.')
  })

  it.each([
    [50, 'progress--ok', 'Dans la limite'],
    [80, 'progress--warning', "Seuil d'alerte atteint"],
    [100, 'progress--danger', 'Limite atteinte'],
    [112, 'progress--danger', 'Dépassé'],
  ])('à %i %% : état %s écrit en clair (« %s »)', (value, cls, text) => {
    const wrapper = render(value)
    expect(wrapper.classes()).toContain(cls)
    expect(wrapper.find('.progress__state').text()).toBe(text)
  })

  it('plafonne la barre à 100 % et aria-valuenow au maximum en cas de dépassement', () => {
    const wrapper = render(5600, 5000)
    expect(wrapper.find('.progress__fill').attributes('style')).toContain('width: 100%')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('5000')
    expect(wrapper.find('.progress__percent').text()).toBe('112 %')
  })

  it('respecte des seuils personnalisés et un maximum nul', () => {
    expect(render(60, 100, { warningAt: 50 }).classes()).toContain('progress--warning')
    expect(render(10, 0).find('.progress__percent').text()).toBe('0 %')
  })
})
