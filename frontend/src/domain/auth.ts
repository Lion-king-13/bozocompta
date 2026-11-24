import type { IsoDateTime } from './common'
import type { User } from './user'

/** Session SIMULÉE côté front (voir ARCHITECTURE.md : ce n'est PAS de la sécurité). */
export interface Session {
  token: string
  user: User
  expiresAt: IsoDateTime
}

export interface LoginCredentials {
  email: string
  password: string
}
