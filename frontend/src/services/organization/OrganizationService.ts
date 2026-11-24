import type { LegalEntity, Organization } from '@/domain'

export interface OrganizationService {
  /** Organisation de l'utilisateur connecté. */
  getCurrentOrganization(): Promise<Organization>
  /** Entités accessibles à l'utilisateur connecté. */
  listEntities(): Promise<LegalEntity[]>
}
