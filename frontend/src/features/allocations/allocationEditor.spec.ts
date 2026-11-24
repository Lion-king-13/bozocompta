import { describe, expect, it } from 'vitest'
import { previewAllocation, splitLinesEvenly, toAllocationInputs } from './allocationEditor'

const line = (entityId: string, percent: string, costCenterId = '') => ({
  entityId,
  costCenterId,
  percent,
})

describe('éditeur de répartition (logique)', () => {
  it('exemple obligatoire : 3 000 € en 60 / 40 → 1 800 € / 1 200 €', () => {
    const p = previewAllocation(300_000, [
      line('ent-be', '60'),
      line('ent-fr', '40', 'cc-fr-paris'),
    ])
    expect(p.lines.map((l) => l.amountCents)).toEqual([180_000, 120_000])
    expect(p.allocatedCents).toBe(300_000)
    expect(p.blockingReason).toBeNull()
  })

  it('passage à 50 / 50 → 1 500 € / 1 500 €', () => {
    const p = previewAllocation(300_000, [
      line('ent-be', '50'),
      line('ent-fr', '50', 'cc-fr-paris'),
    ])
    expect(p.lines.map((l) => l.amountCents)).toEqual([150_000, 150_000])
  })

  it('une somme différente de 100 % est refusée, avec le reste exact', () => {
    const under = previewAllocation(300_000, [line('ent-be', '60'), line('ent-fr', '30')])
    expect(under.blockingReason).toMatch(/100 %/)
    expect(under.remainingBp).toBe(1000)
    expect(under.remainingCents).toBe(30_000)
    const over = previewAllocation(300_000, [line('ent-be', '70'), line('ent-fr', '40')])
    expect(over.blockingReason).toMatch(/dépasse/)
    expect(over.remainingBp).toBe(-1000)
  })

  it('100,00 € en trois tiers : aucun centime perdu', () => {
    const lines = splitLinesEvenly([
      line('ent-be', ''),
      line('ent-fr', ''),
      line('ent-fr', '', 'cc-fr-paris'),
    ])
    expect(lines.map((l) => l.percent)).toEqual(['33,34', '33,33', '33,33'])
    const p = previewAllocation(10_000, lines)
    expect(p.lines.map((l) => l.amountCents)).toEqual([3334, 3333, 3333])
    expect(p.allocatedCents).toBe(10_000)
    expect(p.blockingReason).toBeNull()
  })

  it('refuse une cible en double et une ligne sans entité', () => {
    const dup = previewAllocation(300_000, [line('ent-be', '50'), line('ent-be', '50')])
    expect(dup.lineErrors[1]).toMatch(/déjà/)
    expect(dup.blockingReason).not.toBeNull()
    const noEntity = previewAllocation(300_000, [line('', '100')])
    expect(noEntity.lineErrors[0]).toMatch(/entité/)
  })

  it('convertit la saisie en points de base pour le service', () => {
    expect(toAllocationInputs([line('ent-fr', '33,5', 'cc-fr-paris')])).toEqual([
      { entityId: 'ent-fr', costCenterId: 'cc-fr-paris', percentBp: 3350 },
    ])
  })
})
