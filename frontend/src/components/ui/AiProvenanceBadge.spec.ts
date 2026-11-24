import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AiProvenanceBadge from './AiProvenanceBadge.vue'
import { AI_PROVENANCE, AI_PROVENANCE_ORDER } from './catalog'

describe('AiProvenanceBadge', () => {
  it.each(AI_PROVENANCE_ORDER)(
    '« %s » : libellé visible, description pour les lecteurs d’écran',
    (kind) => {
      const wrapper = mount(AiProvenanceBadge, { props: { provenance: kind } })
      expect(wrapper.classes()).toContain(`ai-badge--${kind}`)
      expect(wrapper.text()).toContain(AI_PROVENANCE[kind].label)
      expect(wrapper.find('.sr-only').text()).toContain(AI_PROVENANCE[kind].description)
      expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
    },
  )

  it('les cinq états ont des libellés et des icônes tous différents (jamais la couleur seule)', () => {
    const labels = AI_PROVENANCE_ORDER.map((k) => AI_PROVENANCE[k].label)
    const icons = AI_PROVENANCE_ORDER.map((k) => AI_PROVENANCE[k].icon)
    expect(new Set(labels).size).toBe(5)
    expect(new Set(icons).size).toBe(5)
  })

  it('accepte les valeurs du domaine (ai_extracted, user_corrected…)', () => {
    const wrapper = mount(AiProvenanceBadge, { props: { provenance: 'user_corrected' } })
    expect(wrapper.classes()).toContain('ai-badge--corrected')
    expect(wrapper.text()).toContain('Corrigé')
  })

  it('affiche le détail facultatif', () => {
    const wrapper = mount(AiProvenanceBadge, {
      props: { provenance: 'corrected', detail: 'par Alice Martin' },
    })
    expect(wrapper.find('.ai-badge__detail').text()).toBe('· par Alice Martin')
  })
})
