import type { HttpClient } from '@/core/http/httpClient'
import type { Invoice, InvoiceDraft, InvoiceSaveOptions, Page } from '@/domain'
import type { InvoiceService } from './InvoiceService'

/** `?allowDuplicate=true` seulement après confirmation explicite d'un doublon (QA-08). */
const saveQuery = (options?: InvoiceSaveOptions) =>
  options?.allowDuplicate ? { allowDuplicate: true } : undefined

export function createHttpInvoiceService(http: HttpClient): InvoiceService {
  const path = (id: string) => `/invoices/${encodeURIComponent(id)}`
  return {
    listInvoices: (query = {}) =>
      http.get<Page<Invoice>>('/invoices', { query: { ...query }, operation: 'invoices.list' }),
    getInvoice: (id) => http.get<Invoice>(path(id), { operation: 'invoices.get' }),
    createInvoice: (input, options) =>
      http.post<Invoice>('/invoices', {
        body: input,
        query: saveQuery(options),
        operation: 'invoices.create',
      }),
    updateInvoice: (id, input, options) =>
      http.put<Invoice>(path(id), {
        body: input,
        query: saveQuery(options),
        operation: 'invoices.update',
      }),
    rejectInvoice: (id, reason) =>
      http.post<Invoice>(`${path(id)}/reject`, {
        body: { reason: reason ?? null },
        operation: 'invoices.reject',
      }),
    validateInvoice: (id) =>
      http.post<Invoice>(`${path(id)}/validate`, { operation: 'invoices.validate' }),
    async importInvoicePdf(file) {
      const form = new FormData()
      form.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), file.name)
      return http.post<InvoiceDraft>('/invoices/import-pdf', {
        body: form,
        operation: 'imports.invoicePdf',
      })
    },
    confirmDraft: (draftId, input, options) =>
      http.post<Invoice>(`/invoice-drafts/${encodeURIComponent(draftId)}/confirm`, {
        body: input,
        query: saveQuery(options),
        operation: 'invoices.confirmDraft',
      }),
  }
}
