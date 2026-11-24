import type { HttpClient } from '@/core/http/httpClient'
import type { Session } from '@/domain'
import type { AuthService } from './AuthService'

/** Squelette HTTP — contrats provisoires : docs/partie-b/CONTRATS_API.md § Auth. */
export function createHttpAuthService(http: HttpClient): AuthService {
  return {
    login: (credentials) =>
      http.post<Session>('/auth/login', { body: credentials, operation: 'auth.login' }),
    signUp: (input) =>
      http.post<Session>('/auth/signup', { body: input, operation: 'auth.signUp' }),
    // Le jeton est déjà envoyé dans l'en-tête Authorization par le client HTTP.
    restoreSession: () => http.get<Session>('/auth/session', { operation: 'auth.restoreSession' }),
    logout: () => http.post<void>('/auth/logout', { operation: 'auth.logout' }),
    listDemoAccounts: async () => [],
  }
}
