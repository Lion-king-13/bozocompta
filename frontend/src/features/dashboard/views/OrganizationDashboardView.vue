<script setup lang="ts">
/**
 * Tableau de bord sans entité choisie :
 * - admin / finance : organisation consolidée (chaque dépense comptée une seule fois) ;
 * - manager : « Toutes mes entités » = somme de ses tableaux de bord d'entité (QA-03) ;
 * - member : ses propres dépenses (QA-20).
 * Si une entité est choisie dans le périmètre partagé (en-tête), arriver ici (ex. « Tableau de
 * bord » dans la navigation) ouvre le tableau de bord de cette entité, en gardant la période.
 * Le retour explicite à « toutes entités » remet d'abord le périmètre à vide (ScopeNav, en-tête).
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PageHeader } from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useEntityScopeStore } from '@/stores/entityScope'
import DashboardContent from '../components/DashboardContent.vue'
import PeriodFilter from '../components/PeriodFilter.vue'
import ScopeNav from '../components/ScopeNav.vue'
import { useDashboardAudience } from '../composables/useDashboardAudience'
import { useReferenceLabels } from '../composables/useReferenceLabels'

const org = useAsync(() => useServices().organization.getCurrentOrganization())
const labels = useReferenceLabels()
void labels.load()
const audience = useDashboardAudience()
const scope = useEntityScopeStore()
const route = useRoute()
const router = useRouter()
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

const header = computed(() => {
  if (audience.value === 'organization')
    return {
      title: 'Tableau de bord',
      description:
        'Organisation consolidée : chaque dépense est comptée une seule fois, quelle que soit sa répartition entre entités.',
    }
  if (audience.value === 'personal')
    return {
      title: 'Mes dépenses',
      description:
        'Vos propres dépenses (cartes à votre nom). Les dépenses de vos collègues ne sont pas affichées.',
    }
  return {
    title: 'Tableau de bord — Toutes mes entités',
    description:
      'Somme de vos tableaux de bord d’entité : seules les parts imputées à vos entités sont comptées.',
  }
})
</script>

<template>
  <div class="page">
    <PageHeader :title="header.title" :description="header.description">
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
