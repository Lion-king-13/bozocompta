import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FileDropZone from './FileDropZone.vue'
import type { RejectedFile } from './types'

function file(name: string, sizeBytes = 10): File {
  return new File([new Uint8Array(sizeBytes)], name)
}

async function drop(wrapper: ReturnType<typeof mount>, files: File[]) {
  await wrapper.find('label').trigger('drop', { dataTransfer: { files } })
}

describe('FileDropZone', () => {
  it('relie le libellé au vrai champ fichier (accessible au clavier)', () => {
    const wrapper = mount(FileDropZone, { props: { label: 'Déposez un PDF', accept: '.pdf' } })
    const input = wrapper.find('input[type="file"]')
    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('accept')).toBe('.pdf')
  })

  it('accepte un fichier avec la bonne extension', async () => {
    const wrapper = mount(FileDropZone, { props: { label: 'PDF', accept: '.pdf' } })
    await drop(wrapper, [file('facture.PDF')])
    expect((wrapper.emitted('select')![0]![0] as File[])[0]!.name).toBe('facture.PDF')
    expect(wrapper.emitted('reject')).toBeUndefined()
  })

  it('refuse une mauvaise extension ou un fichier trop lourd, avec un message en français', async () => {
    const wrapper = mount(FileDropZone, { props: { label: 'CSV', accept: '.csv', maxSizeMb: 1 } })
    await drop(wrapper, [file('releve.xlsx'), file('gros.csv', 2 * 1024 * 1024)])
    const rejected = wrapper.emitted('reject')![0]![0] as RejectedFile[]
    expect(rejected.map((r) => r.reason)).toEqual(['type', 'size'])
    expect(rejected[0]!.message).toContain("n'est pas un fichier .CSV")
    expect(rejected[1]!.message).toContain('dépasse 1 Mo')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('ne garde qu’un fichier sans `multiple`', async () => {
    const wrapper = mount(FileDropZone, { props: { label: 'PDF', accept: '.pdf' } })
    await drop(wrapper, [file('a.pdf'), file('b.pdf')])
    expect(wrapper.emitted('select')![0]![0]).toHaveLength(1)
  })

  it('ignore un dépôt quand la zone est désactivée et affiche l’erreur reçue', async () => {
    const wrapper = mount(FileDropZone, {
      props: { label: 'PDF', accept: '.pdf', disabled: true, error: 'Fichier invalide.' },
    })
    await drop(wrapper, [file('a.pdf')])
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('Fichier invalide.')
  })
})
