import { applyRate, sumCents } from '@/core/money'
import type { Cents, Id } from '../common'
import type { InvoiceLine, InvoiceLineInput } from '../invoice'
import type { DataProvenance } from '../provenance'

/** Calcule HT / TVA / TTC d'une ligne. La TVA est arrondie au centime PAR LIGNE (HYPOTHÈSE). */
export function computeInvoiceLine(
  id: Id,
  input: InvoiceLineInput,
  provenance: DataProvenance,
): InvoiceLine {
  const totalExclVatCents = input.unitPriceCents * input.quantity
  const vatCents = applyRate(totalExclVatCents, input.vatRateBp)
  return {
    id,
    ...input,
    totalExclVatCents,
    vatCents,
    totalInclVatCents: totalExclVatCents + vatCents,
    provenance,
  }
}

export interface InvoiceTotals {
  totalExclVatCents: Cents
  vatCents: Cents
  totalInclVatCents: Cents
}

/** Totaux d'une facture = sommes exactes des lignes. */
export function computeInvoiceTotals(lines: readonly InvoiceLine[]): InvoiceTotals {
  return {
    totalExclVatCents: sumCents(lines.map((l) => l.totalExclVatCents)),
    vatCents: sumCents(lines.map((l) => l.vatCents)),
    totalInclVatCents: sumCents(lines.map((l) => l.totalInclVatCents)),
  }
}
