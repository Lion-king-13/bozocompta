import type { HttpClient } from '@/core/http/httpClient'
import type { LegalEntity, Organization } from '@/domain'
import type { OrganizationService } from './OrganizationService'

export function createHttpOrganizationService(http: HttpClient): OrganizationService {
  return {
    getCurrentOrganization: () =>
      http.get<Organization>('/organization', { operation: 'organization.get' }),
    listEntities: () =>
      http.get<LegalEntity[]>('/entities', { operation: 'organization.listEntities' }),
  }
}
