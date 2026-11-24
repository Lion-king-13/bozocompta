import { beforeEach, describe, expect, it } from 'vitest'
import { resetToasts, useToasts } from './useToasts'

describe('useToasts', () => {
  beforeEach(() => resetToasts())

  it('partage la même liste entre tous les appels', () => {
    useToasts().success('Facture validée.')
    expect(useToasts().toasts.value).toHaveLength(1)
  })

  it('associe un ton à chaque méthode et renvoie un identifiant', () => {
    const t = useToasts()
    const id = t.error('Serveur injoignable.')
    t.info('Information.')
    t.success('OK.')
    expect(t.toasts.value.map((x) => x.tone)).toEqual(['danger', 'info', 'success'])
    expect(t.toasts.value[0]).toMatchObject({ id, title: 'Serveur injoignable.' })
  })

  it('retire un toast avec dismiss', () => {
    const t = useToasts()
    const id = t.success('A')
    t.success('B')
    t.dismiss(id)
    expect(t.toasts.value.map((x) => x.title)).toEqual(['B'])
  })
})
