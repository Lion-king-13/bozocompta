import type { HttpClient } from '@/core/http/httpClient'
import type { BankAccount, BankTransactionView, CsvImportResult, ImportBatch, Page } from '@/domain'
import type { TransactionService } from './TransactionService'

export function createHttpTransactionService(http: HttpClient): TransactionService {
  return {
    listTransactions: (query = {}) =>
      http.get<Page<BankTransactionView>>('/transactions', {
        query: { ...query },
        operation: 'transactions.list',
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
  }
}
