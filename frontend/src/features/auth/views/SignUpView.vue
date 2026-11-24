<script setup lang="ts">
/**
 * Inscription SIMULÉE : crée un compte fictif de collaborateur dans l'organisation de
 * démonstration, pour la session en cours uniquement (arbitrage D13, hypothèse H6).
 */
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseTextField from '@/components/ui/BaseTextField.vue'
import { useToasts } from '@/composables/useToasts'
import { PLANS } from '@/config/plans'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'

type Field = 'firstName' | 'lastName' | 'email' | 'password' | 'consent'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToasts()
const isMock = useServices().mode === 'mock'

const form = reactive({ firstName: '', lastName: '', email: '', password: '' })
const consent = ref(false)
const planId = ref(
  typeof route.query.plan === 'string' && PLANS.some((p) => p.id === route.query.plan)
    ? route.query.plan
    : (PLANS[0]?.id ?? ''),
)
const errors = reactive<Partial<Record<Field, string>>>({})
const apiError = ref<ApiError | null>(null)
const submitting = ref(false)

const selectedPlan = computed(() => PLANS.find((p) => p.id === planId.value))

function validate(): boolean {
  errors.firstName = form.firstName.trim() ? undefined : 'Saisissez votre prénom.'
  errors.lastName = form.lastName.trim() ? undefined : 'Saisissez votre nom.'
  errors.email = !form.email.trim()
    ? 'Saisissez votre adresse e-mail professionnelle.'
    : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
      ? undefined
      : 'Adresse e-mail invalide (exemple : prenom.nom@entreprise.be).'
  errors.password =
    form.password.length >= 4 ? undefined : 'Choisissez un mot de passe d’au moins 4 caractères.'
  errors.consent = consent.value
    ? undefined
    : 'Vous devez avoir lu la politique de confidentialité et la note de transparence IA.'
  return !Object.values(errors).some(Boolean)
}

async function focusFirstError() {
  await nextTick()
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function submit() {
  apiError.value = null
  if (!validate()) return focusFirstError()
  submitting.value = true
  try {
    await auth.signUp({ ...form })
    toast.success('Compte de démonstration créé. Les données affichées sont fictives.')
    await router.push({ name: RouteName.OrganizationDashboard })
  } catch (e) {
    const error = toApiError(e)
    // Erreurs par champ renvoyées par le service : affichées sous le champ concerné
    const known = error.details.filter((d) => d.field in form)
    known.forEach((d) => (errors[d.field as Field] = d.message))
    if (known.length) await focusFirstError()
    else apiError.value = error
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-labelledby="signup-title">
      <h1 id="signup-title" class="auth-card__title">Créer un compte de démonstration</h1>

      <BaseAlert v-if="isMock" tone="info" title="Inscription simulée">
        Votre compte rejoint l’organisation fictive de démonstration avec le rôle
        <strong>Collaborateur</strong>, pour cette session uniquement. Aucun e-mail n’est envoyé et
        aucune donnée ne quitte votre navigateur.
      </BaseAlert>

      <form class="auth-form" novalidate @submit.prevent="submit">
        <div class="auth-form__row">
          <BaseTextField
            v-model="form.firstName"
            label="Prénom"
            autocomplete="given-name"
            required
            :error="errors.firstName"
          />
          <BaseTextField
            v-model="form.lastName"
            label="Nom"
            autocomplete="family-name"
            required
            :error="errors.lastName"
          />
        </div>
        <BaseTextField
          v-model="form.email"
          label="E-mail professionnel"
          type="email"
          autocomplete="email"
          required
          :error="errors.email"
        />
        <BaseTextField
          v-model="form.password"
          label="Mot de passe"
          type="password"
          autocomplete="new-password"
          hint="4 caractères minimum (démonstration)."
          required
          :error="errors.password"
        />

        <fieldset v-if="PLANS.length" class="plans">
          <legend class="plans__legend">Offre qui vous intéresse</legend>
          <label
            v-for="plan in PLANS"
            :key="plan.id"
            class="plan-option"
            :class="{ 'is-selected': planId === plan.id }"
          >
            <input v-model="planId" type="radio" name="plan" :value="plan.id" />
            <span class="plan-option__body">
              <span class="plan-option__name">{{ plan.name }}</span>
              <span class="plan-option__price"
                >{{ formatCents(plan.monthlyPriceCents) }} HT / mois · tarif indicatif</span
              >
            </span>
          </label>
          <p class="plans__hint">
            En démonstration, ce choix n’est pas enregistré : l’organisation fictive utilise déjà
            une offre.<template v-if="selectedPlan"> {{ selectedPlan.tagline }}</template>
          </p>
        </fieldset>

        <BaseCheckbox
          v-model="consent"
          label="J’ai lu la politique de confidentialité et la note de transparence IA"
          required
          :error="errors.consent"
        >
        </BaseCheckbox>
        <p class="auth-form__links">
          <RouterLink :to="{ name: RouteName.PublicPrivacy }" target="_blank">
            Lire la politique de confidentialité et de transparence IA (nouvel onglet)
          </RouterLink>
        </p>

        <BaseButton type="submit" block :loading="submitting"
          >Créer mon compte de démonstration</BaseButton
        >
      </form>

      <ErrorMessage :error="apiError" @retry="submit" />

      <p class="auth-card__switch">
        Déjà un compte ? <RouterLink :to="{ name: RouteName.Login }">Se connecter</RouterLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  padding: var(--space-10) var(--page-gutter) var(--space-12);
  background:
    radial-gradient(50rem 24rem at 100% 0%, var(--palette-petrol-100), transparent 60%),
    var(--color-bg);
}

.auth-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 34rem;
  margin: 0 auto;
  padding: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.auth-card__title {
  font-size: var(--font-size-2xl);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-form__row {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 480px) {
  .auth-form__row {
    grid-template-columns: 1fr 1fr;
  }
}

.auth-form__links {
  margin-top: calc(var(--space-2) * -1);
  padding-left: calc(1.125rem + var(--space-3));
  font-size: var(--font-size-sm);
}

.plans {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  border: 0;
}

.plans__legend {
  margin-bottom: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.plan-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.plan-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.plan-option input {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--color-primary);
}

.plan-option input:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.plan-option__body {
  display: flex;
  flex-direction: column;
}

.plan-option__name {
  font-weight: var(--font-weight-semibold);
}

.plan-option__price,
.plans__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.auth-card__switch {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
