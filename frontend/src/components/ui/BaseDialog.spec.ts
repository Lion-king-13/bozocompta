import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import BaseDialog from './BaseDialog.vue'

/** Hôte de test : un bouton déclencheur + la modale avec deux boutons. */
const Host = defineComponent({
  components: { BaseDialog },
  setup: () => ({ open: ref(false) }),
  template: `
    <button id="trigger" @click="open = true">Ouvrir</button>
    <BaseDialog v-model:open="open" title="Supprimer ?" description="Action définitive.">
      <input id="first" />
      <template #footer>
        <button id="cancel">Annuler</button>
        <button id="last">Confirmer</button>
      </template>
    </BaseDialog>`,
})

async function openDialog() {
  const wrapper = mount(Host, { attachTo: document.body })
  const trigger = document.getElementById('trigger') as HTMLButtonElement
  trigger.focus()
  trigger.click()
  await nextTick()
  await nextTick()
  return wrapper
}

function dialog(): HTMLElement {
  return document.querySelector('[role="dialog"]') as HTMLElement
}

describe('BaseDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('est une modale nommée par son titre et décrite', async () => {
    await openDialog()
    const el = dialog()
    expect(el.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(el.getAttribute('aria-labelledby') ?? '')
    expect(title?.textContent).toBe('Supprimer ?')
    expect(document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Action définitive.',
    )
  })

  it('place le focus sur le premier élément interactif (hors bouton fermer)', async () => {
    await openDialog()
    expect(document.activeElement?.id).toBe('first')
  })

  it('piège le focus : Tab sur le dernier élément revient au premier, et inversement', async () => {
    await openDialog()
    const close = document.querySelector('.dialog__close') as HTMLElement
    const last = document.getElementById('last') as HTMLElement
    last.focus()
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(close)
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)
  })

  it('se ferme avec Échap et rend le focus au déclencheur', async () => {
    const wrapper = await openDialog()
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await nextTick()
    expect((wrapper.vm as unknown as { open: boolean }).open).toBe(false)
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('role="alertdialog" et pas de fermeture au clic extérieur en mode alert', async () => {
    const wrapper = mount(BaseDialog, {
      props: { open: true, title: 'Confirmer', alert: true },
      attachTo: document.body,
    })
    await nextTick()
    const backdrop = document.querySelector('.dialog__backdrop') as HTMLElement
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('persistent : Échap ne ferme pas', async () => {
    const wrapper = mount(BaseDialog, {
      props: { open: true, title: 'Enregistrement', persistent: true },
      attachTo: document.body,
    })
    await nextTick()
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(document.querySelector('.dialog__close')).toBeNull()
  })
})
