import { ApiError } from '@/core/errors'
import type { HttpClient } from '@/core/http/httpClient'
import type { DataExport, DeletionRequest } from '@/domain'
import type { PrivacyService } from './PrivacyService'

export function createHttpPrivacyService(http: HttpClient): PrivacyService {
  return {
    exportMyData: () => http.post<DataExport>('/privacy/export', { operation: 'privacy.export' }),
    requestDeletion: (scope) =>
      http.post<DeletionRequest>('/privacy/deletion-requests', {
        body: { scope },
        operation: 'privacy.requestDeletion',
      }),
    listDeletionRequests: () =>
      http.get<DeletionRequest[]>('/privacy/deletion-requests', {
        operation: 'privacy.listDeletionRequests',
      }),
    resetDemoData: async () => {
      throw new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'Réinitialisation disponible uniquement en mode démo.',
        operation: 'demo.reset',
      })
    },
  }
}
