import type { HttpClient } from '@/core/http/httpClient'
import type { Invoice, InvoiceDraft, Page } from '@/domain'
import type { InvoiceService } from './InvoiceService'

export function createHttpInvoiceService(http: HttpClient): InvoiceService {
  const path = (id: string) => `/invoices/${encodeURIComponent(id)}`
  return {
    listInvoices: (query = {}) =>
      http.get<Page<Invoice>>('/invoices', { query: { ...query }, operation: 'invoices.list' }),
    getInvoice: (id) => http.get<Invoice>(path(id), { operation: 'invoices.get' }),
    updateInvoice: (id, input) =>
      http.put<Invoice>(path(id), { body: input, operation: 'invoices.update' }),
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
    confirmDraft: (draftId, input) =>
      http.post<Invoice>(`/invoice-drafts/${encodeURIComponent(draftId)}/confirm`, {
        body: input,
        operation: 'invoices.confirmDraft',
      }),
  }
}
