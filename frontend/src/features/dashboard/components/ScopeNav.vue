<script setup lang="ts">
/**
 * Navigation entre le tableau de bord consolidé et celui de chaque entité accessible.
 * Met à jour le périmètre partagé (store `entityScope`) et garde la période choisie.
 */
import { useRoute } from 'vue-router'
import type { LegalEntity } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useEntityScopeStore } from '@/stores/entityScope'

defineProps<{ entities: LegalEntity[]; currentEntityId: string | null }>()

const route = useRoute()
const scope = useEntityScopeStore()
</script>

<template>
  <nav class="scope-nav" aria-label="Périmètre du tableau de bord" data-testid="scope-nav">
    <RouterLink
      :to="{ name: RouteName.OrganizationDashboard, query: route.query }"
      class="scope-nav__link"
      :aria-current="currentEntityId === null ? 'page' : undefined"
      @click="scope.select(null)"
    >
      Organisation consolidée
    </RouterLink>
    <RouterLink
      v-for="e in entities"
      :key="e.id"
      :to="{ name: RouteName.EntityDashboard, params: { entityId: e.id }, query: route.query }"
      class="scope-nav__link"
      :aria-current="currentEntityId === e.id ? 'page' : undefined"
      @click="scope.select(e.id)"
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
