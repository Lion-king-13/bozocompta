/**
 * Logique (sans Vue) du formulaire de correction d'une facture.
 *
 * - Le formulaire manipule des CHAÎNES (ce que l'utilisateur tape) ; la conversion en
 *   centimes / points de base se fait une seule fois, dans `formToInput`.
 * - Chaque champ garde sa provenance d'origine (extrait par l'IA, suggestion IA…) ; dès que
 *   la valeur diffère de l'origine, il devient « corrigé par un utilisateur ».
 * - Les totaux HT / TVA / TTC sont TOUJOURS recalculés à partir des lignes (jamais saisis).
 */
import { isIsoDate } from '@/core/dates/dates'
import { parseAmountToCents, ratioBp } from '@/core/money'
import { computeInvoiceLine, computeInvoiceTotals, type InvoiceTotals } from '@/domain/finance'
import type {
  DataProvenance,
  Id,
  Invoice,
  InvoiceDraft,
  InvoiceInput,
  InvoiceLineInput,
} from '@/domain'
import { bpToInput, centsToInput, parsePercentToBp } from '@/features/transactions/shared/percent'

export interface InvoiceLineForm {
  description: string
  quantity: string
  /** Prix unitaire HT saisi, ex. « 2479,34 ». */
  unitPrice: string
  /** Taux de TVA saisi en %, ex. « 21 ». */
  vatRate: string
}

export interface InvoiceForm {
  supplierId: string
  number: string
  issueDate: string
  dueDate: string
  entityId: string
  categoryId: string
  lines: InvoiceLineForm[]
}

export type InvoiceFieldKey = keyof InvoiceForm

/** Valeurs et provenances de départ (pour savoir ce que l'utilisateur a corrigé). */
export interface InvoiceFormOrigin {
  values: InvoiceForm
  provenance: Partial<Record<InvoiceFieldKey, DataProvenance>>
  /** Total TTC lu dans le document (contrôle de cohérence), si connu. */
  extractedTotalCents: number | null
}

export function cloneForm(form: InvoiceForm): InvoiceForm {
  return { ...form, lines: form.lines.map((l) => ({ ...l })) }
}

export function emptyLine(vatRate = '21'): InvoiceLineForm {
  return { description: '', quantity: '1', unitPrice: '', vatRate }
}

/** Brouillon extrait par l'IA (simulée) → formulaire + provenances. */
export function draftToForm(draft: InvoiceDraft, entityId: Id): InvoiceFormOrigin {
  const excl = draft.totalExclVatCents.value
  const vat = draft.vatCents.value
  const rateBp = excl && vat !== null ? ratioBp(vat, excl) : 2100
  const values: InvoiceForm = {
    supplierId: draft.supplierId.value ?? '',
    number: draft.number.value ?? '',
    issueDate: draft.issueDate.value ?? '',
    dueDate: draft.dueDate.value ?? '',
    entityId,
    categoryId: draft.categoryId.value ?? '',
    lines: draft.lines.map((l) => ({
      description: l.description.value ?? '',
      quantity: '1',
      unitPrice: l.totalExclVatCents.value === null ? '' : centsToInput(l.totalExclVatCents.value),
      vatRate: bpToInput(rateBp),
    })),
  }
  if (values.lines.length === 0) values.lines.push(emptyLine(bpToInput(rateBp)))
  return {
    values,
    provenance: {
      supplierId: draft.supplierId.provenance,
      number: draft.number.provenance,
      issueDate: draft.issueDate.provenance,
      dueDate: draft.dueDate.provenance,
      categoryId: draft.categoryId.provenance,
      lines: draft.lines[0]?.description.provenance ?? 'ai_extracted',
    },
    extractedTotalCents: draft.totalInclVatCents.value,
  }
}

/** Facture existante → formulaire ; tous les champs portent la provenance de la facture. */
export function invoiceToForm(invoice: Invoice): InvoiceFormOrigin {
  const p = invoice.provenance
  return {
    values: {
      supplierId: invoice.supplierId,
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      entityId: invoice.entityId,
      categoryId: invoice.categoryId ?? '',
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: String(l.quantity),
        unitPrice: centsToInput(l.unitPriceCents),
        vatRate: bpToInput(l.vatRateBp),
      })),
    },
    provenance: {
      supplierId: p,
      number: p,
      issueDate: p,
      dueDate: p,
      entityId: p,
      categoryId: p,
      lines: p,
    },
    extractedTotalCents: p === 'ai_extracted' ? invoice.totalInclVatCents : null,
  }
}

function sameValue(form: InvoiceForm, origin: InvoiceFormOrigin, key: InvoiceFieldKey): boolean {
  if (key === 'lines') return JSON.stringify(form.lines) === JSON.stringify(origin.values.lines)
  return form[key] === origin.values[key]
}

/**
 * Provenance AFFICHÉE d'un champ : « corrigé » dès que la valeur diffère de l'origine,
 * sinon la provenance d'origine (ou null si le champ a été saisi par l'utilisateur).
 */
export function fieldProvenance(
  form: InvoiceForm,
  origin: InvoiceFormOrigin,
  key: InvoiceFieldKey,
): DataProvenance | null {
  if (!sameValue(form, origin, key)) return origin.provenance[key] ? 'user_corrected' : null
  return origin.provenance[key] ?? null
}

/** true si au moins une valeur est encore « extraite / suggérée par l'IA » (à vérifier). */
export function hasUnreviewedAiValues(form: InvoiceForm, origin: InvoiceFormOrigin): boolean {
  return (Object.keys(origin.provenance) as InvoiceFieldKey[]).some((key) => {
    const p = fieldProvenance(form, origin, key)
    return p === 'ai_extracted' || p === 'ai_suggested'
  })
}

function parseLine(line: InvoiceLineForm): InvoiceLineInput | null {
  const quantity = /^\d+$/.test(line.quantity.trim()) ? Number(line.quantity.trim()) : NaN
  const unitPriceCents = parseAmountToCents(line.unitPrice)
  const vatRateBp = parsePercentToBp(line.vatRate)
  if (!line.description.trim() || !(quantity > 0) || unitPriceCents === null || unitPriceCents < 0)
    return null
  if (vatRateBp === null) return null
  return { description: line.description.trim(), quantity, unitPriceCents, vatRateBp }
}

/** Totaux recalculés à partir des lignes valides (les lignes incomplètes sont ignorées). */
export function computeFormTotals(form: InvoiceForm): InvoiceTotals {
  const lines = form.lines
    .map(parseLine)
    .filter((l): l is InvoiceLineInput => l !== null)
    .map((l, i) => computeInvoiceLine(`preview-${i}`, l, 'user_corrected'))
  return computeInvoiceTotals(lines)
}

export type FormErrors = Record<string, string>

/** Valide le formulaire et construit la saisie envoyée au service (ou les erreurs par champ). */
export function formToInput(form: InvoiceForm): { input: InvoiceInput | null; errors: FormErrors } {
  const errors: FormErrors = {}
  if (!form.supplierId) errors.supplierId = 'Choisissez le fournisseur.'
  if (!form.number.trim()) errors.number = 'Le numéro de facture est requis.'
  if (!isIsoDate(form.issueDate)) errors.issueDate = "Date d'émission invalide."
  if (!isIsoDate(form.dueDate)) errors.dueDate = "Date d'échéance invalide."
  else if (isIsoDate(form.issueDate) && form.dueDate < form.issueDate)
    errors.dueDate = "L'échéance doit suivre la date d'émission."
  if (!form.entityId) errors.entityId = "Choisissez l'entité destinataire."
  if (form.lines.length === 0) errors.lines = 'Ajoutez au moins une ligne.'

  const lines: InvoiceLineInput[] = []
  form.lines.forEach((line, i) => {
    const prefix = `lines.${i}`
    if (!line.description.trim()) errors[`${prefix}.description`] = 'Description requise.'
    if (!/^\d+$/.test(line.quantity.trim()) || Number(line.quantity) <= 0)
      errors[`${prefix}.quantity`] = 'Quantité entière positive.'
    const price = parseAmountToCents(line.unitPrice)
    if (price === null || price < 0) errors[`${prefix}.unitPrice`] = 'Montant invalide (ex. 45,00).'
    if (parsePercentToBp(line.vatRate) === null)
      errors[`${prefix}.vatRate`] = 'Taux invalide (ex. 21).'
    const parsed = parseLine(line)
    if (parsed) lines.push(parsed)
  })

  if (Object.keys(errors).length > 0) return { input: null, errors }
  return {
    input: {
      entityId: form.entityId,
      supplierId: form.supplierId,
      categoryId: form.categoryId || null,
      number: form.number.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      lines,
    },
    errors,
  }
}

/** Erreurs de validation renvoyées par le service (`details[].field`) → erreurs du formulaire. */
export function serviceErrorsToForm(details: { field: string; message: string }[]): FormErrors {
  const errors: FormErrors = {}
  for (const d of details) {
    const field = d.field.replace(/unitPriceCents$/, 'unitPrice')
    errors[field] = d.message
  }
  return errors
}

/** Formulaire vide pour une saisie manuelle (aucune provenance IA : tout est saisi à la main). */
export function emptyFormOrigin(entityId: Id): InvoiceFormOrigin {
  return {
    values: {
      supplierId: '',
      number: '',
      issueDate: '',
      dueDate: '',
      entityId,
      categoryId: '',
      lines: [emptyLine()],
    },
    provenance: {},
    extractedTotalCents: null,
  }
}

/** Refus « doublon » du service : même fournisseur + même numéro (QA-08). */
export function isDuplicateConflict(error: {
  code: string
  details: { field: string }[]
}): boolean {
  return error.code === 'CONFLICT' && error.details[0]?.field === 'number'
}

/** Message lisible pour un doublon : numéro et fournisseur, jamais d'identifiant technique. */
export function duplicateMessage(
  input: Pick<InvoiceInput, 'number'>,
  supplierName: string,
): string {
  return `Une facture n° ${input.number} de « ${supplierName} » existe déjà.`
}
