import { ApiError, clearErrorSimulation, getErrorSimulation } from '@/core/errors'
import { ROLE_LABELS, type Session, type User } from '@/domain'
import { DEMO_PASSWORD } from '@/mocks/dataset'
import type { MockContext } from '../mock/context'
import { validationError } from '@/core/mock/mockRuntime'
import type { AuthService } from './AuthService'

const TOKEN_PREFIX = 'mock-session.'

function sessionFor(ctx: MockContext, user: User): Session {
  ctx.session.userId = user.id
  // Jeton FACTICE : il contient l'id en clair. Ce n'est pas un secret, c'est une simulation.
  return { token: `${TOKEN_PREFIX}${user.id}`, user, expiresAt: '2026-11-20T18:00:00Z' }
}

/**
 * QA-15 : une « session expirée » simulée concerne l'ANCIENNE session. Une nouvelle connexion
 * réussie y met fin (sinon l'utilisateur serait de nouveau expulsé à la page suivante).
 */
function endSimulatedExpiry(): void {
  if (getErrorSimulation()?.scenario === 'unauthorized') clearErrorSimulation()
}

function invalidCredentials(operation: string): ApiError {
  return new ApiError({
    code: 'UNAUTHENTICATED',
    status: 401,
    message: 'E-mail ou mot de passe incorrect.',
    operation,
  })
}

export function createMockAuthService(ctx: MockContext): AuthService {
  const { runtime } = ctx
  return {
    login: ({ email, password }) =>
      runtime.run('auth.login', () => {
        const user = ctx.db.users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.active,
        )
        if (!user || password !== DEMO_PASSWORD) throw invalidCredentials('auth.login')
        endSimulatedExpiry()
        return sessionFor(ctx, user)
      }),

    signUp: (input) =>
      runtime.run('auth.signUp', () => {
        const email = input.email.trim().toLowerCase()
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
          throw validationError('auth.signUp', 'email', 'Adresse e-mail invalide.')
        if (!input.firstName.trim() || !input.lastName.trim())
          throw validationError('auth.signUp', 'lastName', 'Nom et prénom requis.')
        if (input.password.length < 4)
          throw validationError('auth.signUp', 'password', '4 caractères minimum (démo).')
        if (ctx.db.users.some((u) => u.email.toLowerCase() === email))
          throw validationError('auth.signUp', 'email', 'Cet e-mail est déjà utilisé.')
        const user: User = {
          id: ctx.nextId('usr'),
          organizationId: 'org-lumen',
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email,
          role: 'member',
          entityIds: ['ent-be'],
          jobTitle: 'Nouveau collaborateur (démo)',
          active: true,
        }
        ctx.db.users.push(user)
        endSimulatedExpiry()
        return sessionFor(ctx, user)
      }),

    restoreSession: (token) =>
      runtime.run('auth.restoreSession', () => {
        const userId = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : ''
        const user = ctx.db.users.find((u) => u.id === userId && u.active)
        if (!user)
          throw new ApiError({
            code: 'UNAUTHENTICATED',
            status: 401,
            message: 'Session expirée.',
            operation: 'auth.restoreSession',
          })
        return sessionFor(ctx, user)
      }),

    logout: () =>
      runtime.run('auth.logout', () => {
        ctx.session.userId = null
      }),

    listDemoAccounts: () =>
      runtime.run('auth.listDemoAccounts', () =>
        ctx.db.users
          .filter((u) => u.organizationId === 'org-lumen' && u.active)
          .map((u) => ({
            email: u.email,
            password: DEMO_PASSWORD,
            fullName: `${u.firstName} ${u.lastName} — ${ROLE_LABELS[u.role]}`,
            role: u.role,
          })),
      ),
  }
}
