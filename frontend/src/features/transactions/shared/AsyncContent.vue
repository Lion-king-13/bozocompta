<script setup lang="ts">
/**
 * Les trois états d'un contenu chargé par un service, au même endroit :
 * chargement (squelette) → erreur (avec « Réessayer ») → contenu (slot par défaut).
 *   <AsyncContent :loading="loading" :error="error" skeleton="table" @retry="load">…</AsyncContent>
 */
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import type { ApiError } from '@/core/errors'

withDefaults(
  defineProps<{
    loading: boolean
    error: ApiError | null
    /** Forme du squelette. */
    skeleton?: 'text' | 'table' | 'kpi' | 'card'
    /** Titre affiché si le chargement échoue. */
    errorTitle?: string
    loadingLabel?: string
    compact?: boolean
  }>(),
  {
    skeleton: 'table',
    errorTitle: 'Impossible de charger ces données',
    loadingLabel: 'Chargement en cours…',
  },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="error" data-testid="api-error" :data-code="error.code">
    <ErrorState
      :title="errorTitle"
      :message="`${error.message} Vos données ne sont pas perdues.`"
      :code="error.code"
      :hide-retry="error.code === 'FORBIDDEN'"
      :retrying="loading"
      :compact="compact"
      @retry="$emit('retry')"
    />
  </div>
  <LoadingSkeleton v-else-if="loading" :variant="skeleton" :rows="6" :label="loadingLabel" />
  <slot v-else />
</template>
