<script setup lang="ts">
/**
 * Tableau de bord d'une entité. Lecture principale « imputé à », « payé par » en information
 * secondaire (arbitrage D2), les deux toujours libellés.
 *
 * Synchronisation périmètre ↔ route : faite UNE seule fois, par la coque (`AppLayout`).
 * Cette vue ne navigue jamais et ne modifie pas le store `entityScope` : une entité non
 * accessible affiche « Accès refusé » de façon déterministe (QA-16), sans redirection.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ErrorState, PageHeader } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import DashboardContent from '../components/DashboardContent.vue'
import PeriodFilter from '../components/PeriodFilter.vue'
import ScopeNav from '../components/ScopeNav.vue'
import { useReferenceLabels } from '../composables/useReferenceLabels'

const route = useRoute()
const auth = useAuthStore()
const labels = useReferenceLabels()
void labels.load()

const entityId = computed(() => String(route.params.entityId ?? ''))
const allowed = computed(() => auth.canSeeEntity(entityId.value))
const entityName = computed(
  () => labels.entities.value.find((e) => e.id === entityId.value)?.name ?? 'Entité',
)
</script>

<template>
  <div class="page">
    <template v-if="!allowed">
      <PageHeader title="Tableau de bord d’une entité" />
      <ErrorState
        icon="shield"
        title="Accès refusé"
        message="Vous n’avez pas accès à cette entité. Contactez un administrateur si vous pensez qu’il s’agit d’une erreur."
        code="FORBIDDEN"
        hide-retry
        data-testid="entity-forbidden"
      />
    </template>
    <template v-else>
      <PageHeader
        :title="`Tableau de bord — ${entityName}`"
        description="Dépenses imputées à l’entité (lecture principale) et dépenses payées par l’entité (information)."
      />
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
