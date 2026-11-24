<script setup lang="ts">
/**
 * Tableau de bord consolidé de l'organisation. Si un périmètre d'entité est sélectionné
 * (store `entityScope`, par ex. depuis l'en-tête), on affiche le tableau de bord de cette entité.
 */
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PageHeader } from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useEntityScopeStore } from '@/stores/entityScope'
import DashboardContent from '../components/DashboardContent.vue'
import PeriodFilter from '../components/PeriodFilter.vue'
import ScopeNav from '../components/ScopeNav.vue'
import { useReferenceLabels } from '../composables/useReferenceLabels'

const route = useRoute()
const router = useRouter()
const scope = useEntityScopeStore()
const org = useAsync(() => useServices().organization.getCurrentOrganization())
const labels = useReferenceLabels()
void labels.load()

watch(
  () => scope.selectedEntityId,
  (entityId) => {
    if (entityId)
      void router.replace({
        name: RouteName.EntityDashboard,
        params: { entityId },
        query: route.query,
      })
  },
  { immediate: true },
)
</script>

<template>
  <div class="page">
    <PageHeader
      title="Tableau de bord"
      description="Organisation consolidée : chaque dépense est comptée une seule fois, quelle que soit sa répartition entre entités."
    >
      <template #meta>
        <span v-if="org.data.value" class="org-name" data-testid="org-name">
          {{ org.data.value.name }}
        </span>
      </template>
    </PageHeader>
    <div class="page__filters">
      <ScopeNav :entities="labels.entities.value" :current-entity-id="null" />
      <PeriodFilter />
    </div>
    <DashboardContent :entity-id="null" :labels="labels" />
  </div>
</template>

<style scoped>
.page {
  min-width: 0;
}
.page__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.org-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}
</style>
