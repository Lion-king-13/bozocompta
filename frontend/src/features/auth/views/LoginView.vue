<script setup lang="ts">
/**
 * Connexion SIMULÉE (mode démo) : comptes fictifs, aucun mot de passe réellement vérifié par
 * un serveur. Deux façons d'entrer : un clic sur un compte de démonstration, ou le formulaire
 * (préfigure le futur parcours avec le backend).
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextField from '@/components/ui/BaseTextField.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import { toApiError, type ApiError } from '@/core/errors'
import { ROLE_LABELS, type Role } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices, type DemoAccount } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { ROLE_DESCRIPTIONS, ROLE_ORDER } from '../roleDescriptions'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToasts()
const isMock = useServices().mode === 'mock'

const form = reactive({ email: '', password: '' })
const fieldErrors = reactive<{ email?: string; password?: string }>({})
const error = ref<ApiError | null>(null)
const submitting = ref(false)
const pendingEmail = ref<string | null>(null)
const accountsHeading = ref<HTMLElement | null>(null)

const demoAccounts = useAsync(() => useServices().auth.listDemoAccounts())

/** Comptes triés par rôle, du plus large au plus restreint. */
const accounts = computed(() =>
  [...(demoAccounts.data.value ?? [])].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  ),
)

function displayName(account: DemoAccount): string {
  // `fullName` vaut « Prénom Nom — Rôle » : on garde le nom seul.
  return account.fullName.split(' — ')[0] ?? account.fullName
}

function initials(account: DemoAccount): string {
  return displayName(account)
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
}

function validate(): boolean {
  fieldErrors.email = !form.email.trim()
    ? 'Saisissez votre adresse e-mail.'
    : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
      ? undefined
      : 'Adresse e-mail invalide (exemple : prenom.nom@entreprise.be).'
  fieldErrors.password = form.password ? undefined : 'Saisissez votre mot de passe.'
  return !fieldErrors.email && !fieldErrors.password
}

async function signIn(email: string, password: string) {
  error.value = null
  try {
    await auth.login({ email, password })
    toast.success(`Bienvenue ${auth.user?.firstName ?? ''} — session de démonstration ouverte.`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: RouteName.OrganizationDashboard })
  } catch (e) {
    error.value = toApiError(e)
  }
}

async function submit() {
  if (!validate()) {
    await nextTick()
    document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
    return
  }
  submitting.value = true
  await signIn(form.email.trim(), form.password)
  submitting.value = false
}

async function quickLogin(account: DemoAccount) {
  pendingEmail.value = account.email
  await signIn(account.email, account.password)
  pendingEmail.value = null
}

function roleLabel(role: Role) {
  return ROLE_LABELS[role]
}

onMounted(() => {
  if (route.query.demo) accountsHeading.value?.focus()
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__inner">
      <section class="auth-card" aria-labelledby="login-title">
        <h1 id="login-title" class="auth-card__title">Connexion</h1>
        <p class="auth-card__lead">Accédez à l’espace de démonstration de CashLens.</p>

        <BaseAlert
          v-if="auth.sessionExpired"
          tone="warning"
          title="Session expirée"
          data-testid="session-expired"
        >
          Votre session a expiré. Veuillez vous reconnecter.
        </BaseAlert>

        <BaseAlert v-if="isMock" tone="info" title="Connexion simulée">
          Aucun mot de passe n’est vérifié par un serveur et aucune donnée n’est envoyée. Les
          comptes sont fictifs ; le mot de passe de démonstration est <code>demo</code>.
        </BaseAlert>

        <form class="auth-form" novalidate @submit.prevent="submit">
          <BaseTextField
            v-model="form.email"
            label="E-mail"
            type="email"
            autocomplete="username"
            required
            :error="fieldErrors.email"
          />
          <BaseTextField
            v-model="form.password"
            label="Mot de passe"
            type="password"
            autocomplete="current-password"
            required
            :error="fieldErrors.password"
          />
          <BaseButton type="submit" block :loading="submitting">Se connecter</BaseButton>
        </form>

        <ErrorMessage :error="error" @retry="submit" />

        <p class="auth-card__switch">
          Pas encore de compte ?
          <RouterLink :to="{ name: RouteName.SignUp }">Créer un compte de démonstration</RouterLink>
        </p>
      </section>

      <section v-if="isMock" class="accounts" aria-labelledby="accounts-title">
        <h2 id="accounts-title" ref="accountsHeading" class="accounts__title" tabindex="-1">
          Comptes de démonstration
        </h2>
        <p class="accounts__lead">
          Entrez en un clic avec un rôle pour voir ce qu’il peut faire. Les droits suivent la
          matrice provisoire du projet.
        </p>

        <LoadingSkeleton
          v-if="demoAccounts.loading.value"
          variant="card"
          :rows="4"
          label="Chargement des comptes"
        />
        <ErrorMessage :error="demoAccounts.error.value" @retry="demoAccounts.run" />

        <ul v-if="accounts.length" class="accounts__list">
          <li v-for="account in accounts" :key="account.email">
            <button
              type="button"
              class="account"
              :data-role="account.role"
              :data-testid="`demo-login-${account.role}`"
              :disabled="pendingEmail !== null"
              :aria-busy="pendingEmail === account.email ? 'true' : undefined"
              @click="quickLogin(account)"
            >
              <span
                class="account__avatar"
                :class="`account__avatar--${account.role}`"
                aria-hidden="true"
              >
                {{ initials(account) }}
              </span>
              <span class="account__body">
                <span class="account__name">{{ displayName(account) }}</span>
                <span class="account__role">{{ roleLabel(account.role) }}</span>
                <span class="account__desc">{{ ROLE_DESCRIPTIONS[account.role] }}</span>
              </span>
              <span class="account__go" aria-hidden="true">
                {{ pendingEmail === account.email ? '…' : '→' }}
              </span>
              <span class="sr-only">Entrer avec ce compte</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 12rem);
  background:
    radial-gradient(50rem 24rem at 100% 0%, var(--palette-petrol-100), transparent 60%),
    var(--color-bg);
}

.auth-page__inner {
  display: grid;
  gap: var(--space-8);
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--space-10) var(--page-gutter) var(--space-12);
}

@media (min-width: 1024px) {
  .auth-page__inner {
    grid-template-columns: 26rem 1fr;
    align-items: start;
    gap: var(--space-12);
    padding-top: var(--space-16);
  }
}

.auth-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.auth-card__title {
  font-size: var(--font-size-2xl);
}

.auth-card__lead {
  margin-top: calc(var(--space-3) * -1);
  color: var(--color-text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-card__switch {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.accounts__title {
  font-size: var(--font-size-xl);
}

.accounts__title:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.accounts__lead {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
}

.accounts__list {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .accounts__list {
    grid-template-columns: 1fr 1fr;
  }
}

.account {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  height: 100%;
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
  transition:
    border-color var(--duration-fast) var(--easing-standard),
    box-shadow var(--duration-fast) var(--easing-standard);
}

.account:hover:not(:disabled) {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.account:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.account:disabled {
  cursor: progress;
  opacity: 0.7;
}

.account__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.account__avatar--admin {
  background: var(--color-sidebar-bg);
  color: var(--color-text-inverse);
}
.account__avatar--finance {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.account__avatar--manager {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}
.account__avatar--member {
  background: var(--color-neutral-bg);
  color: var(--color-neutral-text);
}

.account__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.account__name {
  font-weight: var(--font-weight-semibold);
}

.account__role {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.account__desc {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-snug);
}

.account__go {
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
}
</style>
