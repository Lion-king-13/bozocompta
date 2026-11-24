<script setup lang="ts">
/**
 * Les trois états d'un bloc chargé depuis un service : squelette pendant le chargement,
 * erreur (avec « Réessayer », sauf accès refusé) ou contenu. Chaque bloc d'un écran échoue
 * indépendamment des autres.
 */
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import type { ApiError } from '@/core/errors'

withDefaults(
  defineProps<{
    loading: boolean
    error: ApiError | null
    /** true dès que des données sont disponibles (on garde l'affichage pendant un rechargement). */
    ready: boolean
    skeleton?: 'text' | 'table' | 'kpi' | 'card'
    rows?: number
    count?: number
    errorTitle?: string
    compact?: boolean
  }>(),
  {
    skeleton: 'card',
    rows: 3,
    count: 4,
    errorTitle: 'Impossible de charger ces données',
  },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="error" data-testid="api-error" :data-code="error.code">
    <ErrorState
      :title="errorTitle"
      :message="error.message"
      :code="error.code"
      :compact="compact"
      :retrying="loading"
      :hide-retry="error.code === 'FORBIDDEN'"
      @retry="$emit('retry')"
    />
  </div>
  <LoadingSkeleton v-else-if="loading && !ready" :variant="skeleton" :rows="rows" :count="count" />
  <slot v-else-if="ready" />
</template>
