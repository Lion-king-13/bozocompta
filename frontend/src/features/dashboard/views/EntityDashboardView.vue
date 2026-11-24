<script setup lang="ts">
/**
 * Tableau de bord d'une entité. Lecture principale « imputé à », « payé par » en information
 * secondaire (arbitrage D2), les deux toujours libellés. Synchronisé avec le périmètre partagé
 * (store `entityScope`) ; une entité non accessible affiche un accès refusé.
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ErrorState, PageHeader } from '@/components/ui'
import { RouteName } from '@/router/routeNames'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import DashboardContent from '../components/DashboardContent.vue'
import PeriodFilter from '../components/PeriodFilter.vue'
import ScopeNav from '../components/ScopeNav.vue'
import { useReferenceLabels } from '../composables/useReferenceLabels'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const labels = useReferenceLabels()
void labels.load()

const entityId = computed(() => String(route.params.entityId ?? ''))
const allowed = computed(() => auth.canSeeEntity(entityId.value))
const entityName = computed(
  () => labels.entities.value.find((e) => e.id === entityId.value)?.name ?? 'Entité',
)

// URL → périmètre partagé
watch(
  entityId,
  (id) => {
    if (id && allowed.value && scope.selectedEntityId !== id) scope.select(id)
  },
  { immediate: true },
)
// Périmètre partagé (ex. sélecteur de l'en-tête) → URL
watch(
  () => scope.selectedEntityId,
  (id) => {
    if (id === entityId.value) return
    void router.push(
      id
        ? { name: RouteName.EntityDashboard, params: { entityId: id }, query: route.query }
        : { name: RouteName.OrganizationDashboard, query: route.query },
    )
  },
)
</script>

<template>
  <div class="page">
    <PageHeader
      :title="`Tableau de bord — ${entityName}`"
      description="Dépenses imputées à l’entité (lecture principale) et dépenses payées par l’entité (information)."
    />
    <ErrorState
      v-if="!allowed"
      icon="shield"
      title="Accès refusé"
      message="Vous n’avez pas accès à cette entité. Contactez un administrateur si vous pensez qu’il s’agit d’une erreur."
      code="FORBIDDEN"
      hide-retry
      data-testid="entity-forbidden"
    />
    <template v-else>
      <div class="page__filters">
        <ScopeNav :entities="labels.entities.value" :current-entity-id="entityId" />
        <PeriodFilter />
      </div>
      <DashboardContent :key="entityId" :entity-id="entityId" :labels="labels" />
    </template>
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
</style>
