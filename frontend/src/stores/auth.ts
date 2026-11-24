import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toApiError } from '@/core/errors'
import { setAuthToken } from '@/core/http/authToken'
import {
  canAccessEntity,
  hasPermission,
  type Id,
  type LoginCredentials,
  type Permission,
  type Session,
} from '@/domain'
import { useServices, type SignUpInput } from '@/services'

/**
 * Session SIMULÉE côté front.
 * ⚠ Ce n'est PAS une mesure de sécurité : rôles et permissions servent seulement à adapter
 * l'affichage (menus, gardes de route). La vraie authentification et le contrôle des droits
 * sont faits par le backend (partie A), qui répond 401 / 403.
 */
const STORAGE_KEY = 'cashlens.session-token'

function readToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* stockage indisponible (navigation privée) : la session ne survivra pas au rechargement */
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const sessionExpired = ref(false)
  let restorePromise: Promise<void> | null = null

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)
  const role = computed(() => user.value?.role ?? null)

  function can(permission: Permission): boolean {
    return !!user.value && hasPermission(user.value.role, permission)
  }

  function canSeeEntity(entityId: Id): boolean {
    return !!user.value && canAccessEntity(user.value, entityId)
  }

  function setSession(next: Session | null): void {
    session.value = next
    setAuthToken(next?.token ?? null)
    writeToken(next?.token ?? null)
    if (next) sessionExpired.value = false
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    setSession(await useServices().auth.login(credentials))
  }

  async function signUp(input: SignUpInput): Promise<void> {
    setSession(await useServices().auth.signUp(input))
  }

  async function logout(): Promise<void> {
    try {
      await useServices().auth.logout()
    } finally {
      setSession(null)
    }
  }

  /** Appelé sur une erreur 401 : on oublie la session et on le signale à l'utilisateur. */
  function expireSession(): void {
    if (!session.value) return
    setSession(null)
    sessionExpired.value = true
  }

  /** Restaure la session au démarrage (une seule fois), à partir du jeton conservé. */
  function ensureRestored(): Promise<void> {
    if (!restorePromise) {
      restorePromise = (async () => {
        const token = readToken()
        if (!token || session.value) return
        setAuthToken(token)
        try {
          setSession(await useServices().auth.restoreSession(token))
        } catch (e) {
          // Jeton refusé (401) : on l'oublie. Autre erreur (réseau…) : on le garde pour réessayer.
          session.value = null
          setAuthToken(null)
          if (toApiError(e).code === 'UNAUTHENTICATED') writeToken(null)
        }
      })()
    }
    return restorePromise
  }

  return {
    session,
    sessionExpired,
    user,
    isAuthenticated,
    role,
    can,
    canSeeEntity,
    login,
    signUp,
    logout,
    expireSession,
    ensureRestored,
    setSession,
  }
})
