import type { LoginCredentials, Role, Session } from '@/domain'

/** Compte de démonstration proposé sur la page de connexion (mode mock uniquement). */
export interface DemoAccount {
  email: string
  password: string
  fullName: string
  role: Role
}

export interface SignUpInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

/**
 * Authentification. En mode mock, c'est une SIMULATION (aucune sécurité) ; la vraie
 * authentification (hash, jetons, expiration) relève de la partie A.
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<Session>
  /** Inscription. Mock : crée un collaborateur dans l'organisation de démonstration. */
  signUp(input: SignUpInput): Promise<Session>
  /** Recharge la session à partir d'un jeton conservé (rechargement de page). */
  restoreSession(token: string): Promise<Session>
  logout(): Promise<void>
  /** Comptes de démo à afficher ; liste vide en mode http. */
  listDemoAccounts(): Promise<DemoAccount[]>
}
