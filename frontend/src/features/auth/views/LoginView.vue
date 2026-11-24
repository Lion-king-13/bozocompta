<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { useAsync } from '@/composables/useAsync'
import { toApiError, type ApiError } from '@/core/errors'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'

/** Connexion SIMULÉE en mode démo (comptes fictifs, mot de passe « demo »). Vue provisoire. */
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref<ApiError | null>(null)
const submitting = ref(false)
const demoAccounts = useAsync(() => useServices().auth.listDemoAccounts())

async function submit() {
  submitting.value = true
  error.value = null
  try {
    await auth.login({ email: email.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: RouteName.OrganizationDashboard })
  } catch (e) {
    error.value = toApiError(e)
  } finally {
    submitting.value = false
  }
}

function fillAccount(accountEmail: string, accountPassword: string) {
  email.value = accountEmail
  password.value = accountPassword
}
</script>

<template>
  <section class="login">
    <h1>Connexion</h1>
    <p v-if="auth.sessionExpired" role="status" data-testid="session-expired">
      Votre session a expiré. Veuillez vous reconnecter.
    </p>
    <form @submit.prevent="submit">
      <label>
        E-mail
        <input v-model="email" type="email" name="email" autocomplete="username" required />
      </label>
      <label>
        Mot de passe
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>
      <button type="submit" :disabled="submitting">Se connecter</button>
    </form>
    <ErrorMessage :error="error" @retry="submit" />
    <p>
      Pas encore de compte ? <RouterLink :to="{ name: RouteName.SignUp }">Inscription</RouterLink>
    </p>

    <div v-if="demoAccounts.data.value?.length" class="demo-accounts">
      <h2>Comptes de démonstration (fictifs)</h2>
      <p>Connexion simulée, sans sécurité réelle. Mot de passe : <code>demo</code>.</p>
      <ul>
        <li v-for="a in demoAccounts.data.value" :key="a.email">
          <button type="button" @click="fillAccount(a.email, a.password)">{{ a.fullName }}</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
form {
  display: grid;
  gap: var(--space-3);
  max-width: 24rem;
}
label {
  display: grid;
  gap: var(--space-1);
}
</style>
