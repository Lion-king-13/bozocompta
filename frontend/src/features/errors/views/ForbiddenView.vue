<script setup lang="ts">
/**
 * Accès refusé (403) : la garde du routeur y renvoie quand le rôle simulé n'a pas la
 * permission de la page demandée. Pas de « Réessayer » : réessayer ne changerait rien.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROLE_LABELS } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import ErrorPage from '../components/ErrorPage.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const isMock = useServices().mode === 'mock'

/** Titre de la page demandée (lu dans la route d'origine), pour un message précis. */
const pageTitle = computed(() => {
  const from = route.query.from
  if (typeof from !== 'string') return null
  try {
    return router.resolve(from).meta.title ?? null
  } catch {
    return null
  }
})
const roleLabel = computed(() => (auth.user ? ROLE_LABELS[auth.user.role] : null))

async function switchAccount() {
  await auth.logout()
  await router.push({ name: RouteName.Login, query: { demo: '1' } })
}
</script>

<template>
  <div data-testid="forbidden">
    <ErrorPage icon="shield" code="Erreur 403" title="Accès refusé">
      <p>
        <template v-if="roleLabel"
          >Votre rôle (<strong>{{ roleLabel }}</strong
          >)</template
        >
        <template v-else>Votre compte</template>
        ne permet pas d’accéder
        <template v-if="pageTitle"> à la page «&nbsp;{{ pageTitle }}&nbsp;»</template>
        <template v-else> à cette page</template>.
      </p>
      <p>
        Si vous pensez qu’il s’agit d’une erreur, contactez un administrateur de votre organisation.
      </p>
      <p class="note">
        Les droits affichés suivent une matrice provisoire ; le serveur vérifie lui-même les accès.
      </p>
      <template #actions>
        <RouterLink
          v-if="auth.isAuthenticated"
          :to="{ name: RouteName.OrganizationDashboard }"
          class="is-primary"
        >
          Retour au tableau de bord
        </RouterLink>
        <RouterLink v-else :to="{ name: RouteName.Landing }" class="is-primary"
          >Retour à l’accueil</RouterLink
        >
        <a v-if="auth.isAuthenticated && isMock" href="#" @click.prevent="switchAccount">
          Changer de compte de démonstration
        </a>
      </template>
    </ErrorPage>
  </div>
</template>

<style scoped>
.note {
  font-size: var(--font-size-sm);
}
</style>
