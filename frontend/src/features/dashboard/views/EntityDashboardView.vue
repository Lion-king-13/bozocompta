<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { useAsync } from '@/composables/useAsync'
import { formatCents } from '@/core/money'
import { useServices } from '@/services'

/**
 * Tableau de bord d'une entité — VERSION PROVISOIRE. Lecture par défaut = « imputé à »,
 * avec « payé par » en information secondaire (arbitrage D2).
 */
const route = useRoute()
const summary = useAsync(() =>
  useServices().dashboard.getSummary({ entityId: String(route.params.entityId) }),
)
watch(
  () => route.params.entityId,
  () => void summary.run(),
)
</script>

<template>
  <section>
    <h1>Tableau de bord entité</h1>
    <ErrorMessage :error="summary.error.value" @retry="summary.run" />
    <dl v-if="summary.data.value" data-testid="entity-summary">
      <dt>Dépenses imputées à l'entité</dt>
      <dd class="amount" data-testid="entity-imputed">
        {{ formatCents(summary.data.value.spend.imputedTotalCents) }}
      </dd>
      <dt>Payées par l'entité (information)</dt>
      <dd class="amount" data-testid="entity-paid">
        {{ formatCents(summary.data.value.spend.paidTotalCents) }}
      </dd>
    </dl>
  </section>
</template>
