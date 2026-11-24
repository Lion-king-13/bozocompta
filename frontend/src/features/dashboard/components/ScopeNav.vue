<script setup lang="ts">
/**
 * Navigation entre la vue « toutes entités » (consolidé pour admin / finance, « Toutes mes
 * entités » sinon) et le tableau de bord de chaque entité accessible.
 * La période est gardée. Liens d'entité : c'est la route qui fait foi, la coque aligne le
 * périmètre partagé sur elle. Lien « toutes entités » : on vide d'abord le périmètre (sinon le
 * tableau de bord sans entité rouvrirait l'entité choisie), puis on navigue avec la période.
 */
import { nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LegalEntity } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useEntityScopeStore } from '@/stores/entityScope'
import { SCOPE_ALL_LABEL, useDashboardAudience } from '../composables/useDashboardAudience'

defineProps<{ entities: LegalEntity[]; currentEntityId: string | null }>()

const route = useRoute()
const router = useRouter()
const scope = useEntityScopeStore()
const audience = useDashboardAudience()

async function showAll(): Promise<void> {
  const query = { ...route.query }
  scope.select(null)
  await nextTick() // laisse la coque réagir ; la navigation ci-dessous la remplace
  await router.push({ name: RouteName.OrganizationDashboard, query })
}
</script>

<template>
  <nav class="scope-nav" aria-label="Périmètre du tableau de bord" data-testid="scope-nav">
    <RouterLink
      :to="{ name: RouteName.OrganizationDashboard, query: route.query }"
      class="scope-nav__link"
      :aria-current="currentEntityId === null ? 'page' : undefined"
      @click.prevent="showAll"
    >
      {{ SCOPE_ALL_LABEL[audience] }}
    </RouterLink>
    <RouterLink
      v-for="e in entities"
      :key="e.id"
      :to="{ name: RouteName.EntityDashboard, params: { entityId: e.id }, query: route.query }"
      class="scope-nav__link"
      :aria-current="currentEntityId === e.id ? 'page' : undefined"
    >
      {{ e.name }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.scope-nav {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}
.scope-nav__link {
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text);
  text-decoration: none;
  font-size: var(--font-size-sm);
  background: var(--color-surface);
}
.scope-nav__link:hover {
  background: var(--color-surface-hover);
}
.scope-nav__link[aria-current='page'] {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: var(--font-weight-semibold);
}
</style>
