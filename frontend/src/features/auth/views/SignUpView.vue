<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { toApiError, type ApiError } from '@/core/errors'
import { RouteName } from '@/router/routeNames'
import { useAuthStore } from '@/stores/auth'

/**
 * Inscription. En mode démo : crée une session SIMULÉE (collaborateur) dans l'organisation
 * de démonstration, annoncée comme telle. Vue provisoire.
 */
const auth = useAuthStore()
const router = useRouter()
const form = reactive({ firstName: '', lastName: '', email: '', password: '' })
const error = ref<ApiError | null>(null)

async function submit() {
  error.value = null
  try {
    await auth.signUp({ ...form })
    await router.push({ name: RouteName.OrganizationDashboard })
  } catch (e) {
    error.value = toApiError(e)
  }
}
</script>

<template>
  <section>
    <h1>Inscription</h1>
    <p role="note">
      Démonstration : l'inscription crée un compte fictif de collaborateur dans l'organisation de
      démonstration, pour cette session uniquement.
    </p>
    <form @submit.prevent="submit">
      <label>Prénom <input v-model="form.firstName" required /></label>
      <label>Nom <input v-model="form.lastName" required /></label>
      <label>E-mail <input v-model="form.email" type="email" required /></label>
      <label>Mot de passe <input v-model="form.password" type="password" required /></label>
      <button type="submit">Créer mon compte</button>
    </form>
    <ErrorMessage :error="error" @retry="submit" />
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
