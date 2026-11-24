import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import BaseTabs from './BaseTabs.vue'

const Host = defineComponent({
  components: { BaseTabs },
  setup: () => ({
    tab: ref('lines'),
    tabs: [
      { id: 'lines', label: 'Lignes', count: 3 },
      { id: 'allocations', label: 'Imputations' },
      { id: 'history', label: 'Historique', disabled: true },
      { id: 'notes', label: 'Notes' },
    ],
  }),
  template: `
    <BaseTabs v-model="tab" label="Détail" :tabs="tabs">
      <template #panel-lines>Contenu lignes</template>
      <template #panel-allocations>Contenu imputations</template>
      <template #panel-notes>Contenu notes</template>
    </BaseTabs>`,
})

describe('BaseTabs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('applique le motif ARIA tabs (tablist, aria-selected, aria-controls, tabindex)', () => {
    const wrapper = mount(Host)
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Détail')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(tabs[0]!.attributes('tabindex')).toBe('0')
    expect(tabs[1]!.attributes('tabindex')).toBe('-1')
    const panel = wrapper.find(`#${tabs[0]!.attributes('aria-controls')}`)
    expect(panel.attributes('role')).toBe('tabpanel')
    expect(panel.text()).toBe('Contenu lignes')
  })

  it('change d’onglet au clic', async () => {
    const wrapper = mount(Host)
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
    expect((wrapper.vm as unknown as { tab: string }).tab).toBe('allocations')
  })

  it('navigue au clavier en sautant les onglets désactivés (→, ←, Début, Fin)', async () => {
    const wrapper = mount(Host, { attachTo: document.body })
    const vm = wrapper.vm as unknown as { tab: string }
    const tabAt = (i: number) => wrapper.findAll('[role="tab"]')[i]!
    await tabAt(1).trigger('keydown', { key: 'ArrowRight' })
    expect(vm.tab).toBe('notes')
    await nextTick()
    expect(document.activeElement?.textContent?.trim()).toBe('Notes')
    await tabAt(3).trigger('keydown', { key: 'ArrowRight' })
    expect(vm.tab).toBe('lines')
    await tabAt(0).trigger('keydown', { key: 'ArrowLeft' })
    expect(vm.tab).toBe('notes')
    await tabAt(3).trigger('keydown', { key: 'Home' })
    expect(vm.tab).toBe('lines')
    await tabAt(0).trigger('keydown', { key: 'End' })
    expect(vm.tab).toBe('notes')
  })
})
