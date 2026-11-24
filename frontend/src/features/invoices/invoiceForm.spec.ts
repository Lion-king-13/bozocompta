import { describe, expect, it } from 'vitest'
import type { InvoiceDraft } from '@/domain'
import {
  cloneForm,
  computeFormTotals,
  draftToForm,
  fieldProvenance,
  formToInput,
  hasUnreviewedAiValues,
} from './invoiceForm'
import { bpToInput, parsePercentToBp } from '@/features/transactions/shared/percent'

const ai = <T>(value: T) => ({ value, provenance: 'ai_extracted' as const, confidenceBp: 9000 })
const draft: InvoiceDraft = {
  id: 'draft-1',
  fileName: 'facture-demo.pdf',
  supplierName: ai('Bureau & Co'),
  supplierId: ai('sup-bureau'),
  number: ai('BC-56010'),
  issueDate: ai('2026-11-18'),
  dueDate: ai('2026-12-18'),
  totalExclVatCents: ai(4_500),
  vatCents: ai(945),
  totalInclVatCents: ai(5_445),
  categoryId: { value: 'cat-office', provenance: 'ai_suggested', confidenceBp: 8200 },
  lines: [{ description: ai('Classeurs à levier (x10)'), totalExclVatCents: ai(4_500) }],
  tokensUsed: 3200,
  simulated: true,
}

describe('formulaire de facture (logique)', () => {
  it('brouillon → formulaire : TVA déduite (21 %) et totaux recalculés identiques au document', () => {
    const origin = draftToForm(draft, 'ent-be')
    expect(origin.values.lines[0]).toEqual({
      description: 'Classeurs à levier (x10)',
      quantity: '1',
      unitPrice: '45,00',
      vatRate: '21',
    })
    expect(computeFormTotals(origin.values)).toEqual({
      totalExclVatCents: 4_500,
      vatCents: 945,
      totalInclVatCents: 5_445,
    })
  })

  it('un champ modifié devient « corrigé par un utilisateur », les autres restent « extraits »', () => {
    const origin = draftToForm(draft, 'ent-be')
    const form = cloneForm(origin.values)
    expect(fieldProvenance(form, origin, 'number')).toBe('ai_extracted')
    expect(fieldProvenance(form, origin, 'categoryId')).toBe('ai_suggested')
    form.number = 'BC-99'
    form.lines[0]!.unitPrice = '50'
    expect(fieldProvenance(form, origin, 'number')).toBe('user_corrected')
    expect(fieldProvenance(form, origin, 'lines')).toBe('user_corrected')
    expect(fieldProvenance(form, origin, 'issueDate')).toBe('ai_extracted')
    expect(hasUnreviewedAiValues(form, origin)).toBe(true)
  })

  it('validation : erreurs par champ, puis saisie en centimes et points de base', () => {
    const origin = draftToForm(draft, 'ent-be')
    const bad = cloneForm(origin.values)
    bad.number = ''
    bad.dueDate = '2026-01-01'
    bad.lines[0]!.unitPrice = '12,5O'
    const { input, errors } = formToInput(bad)
    expect(input).toBeNull()
    expect(Object.keys(errors).sort()).toEqual(['dueDate', 'lines.0.unitPrice', 'number'])

    const ok = formToInput(origin.values)
    expect(ok.input?.lines).toEqual([
      {
        description: 'Classeurs à levier (x10)',
        quantity: 1,
        unitPriceCents: 4_500,
        vatRateBp: 2100,
      },
    ])
  })

  it('pourcentages saisis : lus sans flottant', () => {
    expect(parsePercentToBp('33,33')).toBe(3333)
    expect(parsePercentToBp('12.5 %')).toBe(1250)
    expect(parsePercentToBp('101')).toBeNull()
    expect(parsePercentToBp('1,234')).toBeNull()
    expect(bpToInput(3350)).toBe('33,5')
  })
})
