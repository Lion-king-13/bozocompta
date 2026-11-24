import type { Id } from './common'

/** Catégorie de dépense (ex. « Matériel informatique »), commune à toute l'organisation. */
export interface Category {
  id: Id
  organizationId: Id
  code: string
  name: string
}
