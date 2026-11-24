<script setup lang="ts">
/** Page introuvable (404). */
import { RouteName } from '@/router/routeNames'
import { useAuthStore } from '@/stores/auth'
import ErrorPage from '../components/ErrorPage.vue'

const auth = useAuthStore()
</script>

<template>
  <div data-testid="not-found">
    <ErrorPage icon="search" code="Erreur 404" title="Cette page n’existe pas">
      <p>Le lien est peut-être incomplet, ou la page a été déplacée.</p>
      <template #actions>
        <RouterLink
          v-if="auth.isAuthenticated"
          :to="{ name: RouteName.OrganizationDashboard }"
          class="is-primary"
        >
          Retour au tableau de bord
        </RouterLink>
        <RouterLink
          :to="{ name: RouteName.Landing }"
          :class="{ 'is-primary': !auth.isAuthenticated }"
        >
          Retour à l’accueil
        </RouterLink>
      </template>
    </ErrorPage>
  </div>
</template>
