<script setup lang="ts">
/**
 * Affichage uniforme d'une `ApiError` : titre selon le code, message français, détails par
 * champ et bouton « Réessayer » quand réessayer a un sens (pas pour un accès refusé ou des
 * données invalides). Le code technique est affiché discrètement en mode démonstration.
 *
 *   <ErrorMessage :error="invoices.error.value" @retry="invoices.run" />
 */
import { computed } from 'vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Tone } from '@/components/ui/types'
import type { ApiError, ApiErrorCode } from '@/core/errors'
import { useServices } from '@/services'

const props = withDefaults(
  defineProps<{
    error: ApiError | null
    /** Force l'affichage (true) ou le masquage (false) du bouton Réessayer. */
    retryable?: boolean
  }>(),
  { retryable: undefined },
)
defineEmits<{ retry: [] }>()

const TITLES: Record<ApiErrorCode, string> = {
  INVALID_FILE: 'Fichier invalide',
  AI_UNAVAILABLE: 'Service IA indisponible',
  AI_QUOTA_EXCEEDED: 'Quota IA dépassé',
  NETWORK_ERROR: 'Serveur injoignable',
  TIMEOUT: 'Délai de réponse dépassé',
  UNAUTHENTICATED: 'Session expirée',
  FORBIDDEN: 'Accès refusé',
  NOT_FOUND: 'Élément introuvable',
  CONFLICT: 'Les données ont changé',
  VALIDATION_ERROR: 'Informations invalides',
  RATE_LIMITED: 'Limite atteinte',
  SERVER_ERROR: 'Erreur du serveur',
  UNKNOWN: 'Erreur inattendue',
}

/** Réessayer la même action ne peut pas réussir pour ces erreurs. */
const NOT_RETRYABLE: ApiErrorCode[] = ['FORBIDDEN', 'VALIDATION_ERROR', 'INVALID_FILE', 'NOT_FOUND']

/** Phrase rassurante ajoutée aux erreurs techniques. */
const REASSURE: ApiErrorCode[] = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'AI_UNAVAILABLE']

const showCode = useServices().mode === 'mock'

const tone = computed<Tone>(() =>
  props.error?.code === 'AI_QUOTA_EXCEEDED' || props.error?.code === 'CONFLICT'
    ? 'warning'
    : 'danger',
)
const canRetry = computed(() =>
  props.error ? (props.retryable ?? !NOT_RETRYABLE.includes(props.error.code)) : false,
)
</script>

<template>
  <div v-if="error" class="error-message" data-testid="api-error" :data-code="error.code">
    <BaseAlert :tone="tone" :title="TITLES[error.code]" live>
      <p>{{ error.message }}</p>
      <p v-if="REASSURE.includes(error.code)" class="error-message__reassure">
        Vos données ne sont pas perdues.
      </p>
      <ul v-if="error.details.length" class="error-message__details">
        <li v-for="d in error.details" :key="d.field + d.message">{{ d.message }}</li>
      </ul>
      <p v-if="showCode" class="error-message__code">
        Code : <code>{{ error.code }}</code>
      </p>
      <template v-if="canRetry" #actions>
        <BaseButton size="sm" variant="secondary" icon="refresh" @click="$emit('retry')">
          Réessayer
        </BaseButton>
      </template>
    </BaseAlert>
  </div>
</template>

<style scoped>
.error-message__reassure {
  margin-top: var(--space-1);
}

.error-message__details {
  margin-top: var(--space-2);
  padding-left: var(--space-5);
}

.error-message__code {
  margin-top: var(--space-2);
  font-size: var(--font-size-xs);
  opacity: 0.85;
}
</style>
