import type { HttpClient } from '@/core/http/httpClient'
import type {
  BankAccount,
  BankTransactionView,
  CsvImportResult,
  CsvPreview,
  ImportBatch,
  Page,
} from '@/domain'
import type { TransactionService } from './TransactionService'

export function createHttpTransactionService(http: HttpClient): TransactionService {
  return {
    listTransactions: (query = {}) =>
      http.get<Page<BankTransactionView>>('/transactions', {
        query: { ...query },
        operation: 'transactions.list',
      }),
    getTransaction: (id) =>
      http.get<BankTransactionView>(`/transactions/${encodeURIComponent(id)}`, {
        operation: 'transactions.get',
      }),
    updateTransactionCategory: (id, categoryId) =>
      http.patch<BankTransactionView>(`/transactions/${encodeURIComponent(id)}`, {
        body: { categoryId },
        operation: 'transactions.updateCategory',
      }),
    listMissingReceipts: (query = {}) =>
      http.get<BankTransactionView[]>('/transactions/missing-receipts', {
        query: { ...query },
        operation: 'transactions.listMissingReceipts',
      }),
    listBankAccounts: () =>
      http.get<BankAccount[]>('/bank-accounts', { operation: 'transactions.listBankAccounts' }),
    listImportBatches: () =>
      http.get<ImportBatch[]>('/import-batches', { operation: 'transactions.listImportBatches' }),
    async importCsv(bankAccountId, file) {
      const form = new FormData()
      form.append('bankAccountId', bankAccountId)
      form.append(
        'file',
        new Blob([await file.arrayBuffer()], { type: file.type || 'text/csv' }),
        file.name,
      )
      return http.post<CsvImportResult>('/transactions/import-csv', {
        body: form,
        operation: 'imports.transactionsCsv',
      })
    },

    async previewCsv(file) {
      const form = new FormData()
      form.append(
        'file',
        new Blob([await file.arrayBuffer()], { type: file.type || 'text/csv' }),
        file.name,
      )
      return http.post<CsvPreview>('/transactions/import-csv/preview', {
        body: form,
        operation: 'imports.transactionsCsvPreview',
      })
    },
  }
}
