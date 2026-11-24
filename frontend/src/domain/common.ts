/**
 * Types transverses du modèle métier.
 * Conventions : identifiants = chaînes opaques ; montants = centimes entiers ;
 * pourcentages = points de base ; dates = chaînes ISO.
 */
export type { Cents, BasisPoints, CurrencyCode } from '@/core/money'
export type { IsoDate, IsoDateTime, DateRange } from '@/core/dates/dates'

/** Identifiant opaque (UUID côté backend, `inv-001` etc. dans le jeu mock). */
export type Id = string

/** Paramètres de pagination communs aux listes volumineuses. `page` commence à 1. */
export interface PageQuery {
  page?: number
  pageSize?: number
}

/** Réponse paginée. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const DEFAULT_PAGE_SIZE = 25
