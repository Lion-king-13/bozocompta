import type { Id, IsoDateTime } from './common'

/**
 * Confidentialité / RGPD — SIMULÉ en mode mock. Le traitement réel (export, effacement,
 * délais légaux) relève du backend (partie A).
 */
export interface DataExport {
  id: Id
  requestedAt: IsoDateTime
  requestedByUserId: Id
  /** Contenu JSON de l'export (en mock : données de l'utilisateur courant). */
  fileName: string
  content: string
}

export type DeletionScope = 'my_account' | 'organization'

export interface DeletionRequest {
  id: Id
  scope: DeletionScope
  status: 'pending' | 'completed' | 'cancelled'
  requestedAt: IsoDateTime
  requestedByUserId: Id
}
