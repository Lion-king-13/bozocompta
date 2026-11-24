import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  PROVENANCE_DESCRIPTIONS,
  PROVENANCE_LABELS,
  PROVENANCE_ORDER,
  type DataProvenance,
} from '@/domain/provenance'
import AiProvenanceLegend from './AiProvenanceLegend.vue'
import { AI_PROVENANCE, DOMAIN_PROVENANCE_TO_UI, toUiProvenance } from './catalog'

describe('catalogue de provenance (QA-22 : source unique = domain/provenance.ts)', () => {
  it.each(Object.keys(PROVENANCE_LABELS) as DataProvenance[])(
    '%s : libellé et explication identiques au domaine',
    (p) => {
      const ui = AI_PROVENANCE[DOMAIN_PROVENANCE_TO_UI[p]]
      expect(ui.label).toBe(PROVENANCE_LABELS[p])
      expect(ui.description).toBe(PROVENANCE_DESCRIPTIONS[p])
      expect(toUiProvenance(p)).toBe(DOMAIN_PROVENANCE_TO_UI[p])
    },
  )
})

describe('AiProvenanceLegend (QA-21)', () => {
  it('liste les cinq états dans l’ordre du domaine, avec leurs explications', () => {
    const wrapper = mount(AiProvenanceLegend)
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(5)
    PROVENANCE_ORDER.forEach((p, i) => {
      expect(items[i]!.text()).toContain(PROVENANCE_LABELS[p])
      expect(items[i]!.find('.legend__text').text()).toBe(PROVENANCE_DESCRIPTIONS[p])
    })
    const region = wrapper.get('[data-testid="ai-legend"]')
    expect(wrapper.find(`#${region.attributes('aria-labelledby')}`).text()).toBe(
      'Provenance des informations',
    )
  })

  it('version compacte : badges seuls (explications réservées aux lecteurs d’écran)', () => {
    const wrapper = mount(AiProvenanceLegend, { props: { compact: true } })
    expect(wrapper.findAll('.legend__text')).toHaveLength(0)
    expect(wrapper.findAll('.ai-badge')).toHaveLength(5)
  })
})
