<script setup lang="ts">
/**
 * État d'erreur qui remplace un contenu qui n'a pas pu se charger.
 * Dit ce qui s'est passé, ce qui n'est PAS perdu, et propose « Réessayer ».
 *   <ErrorState title="Impossible de charger les factures"
 *     message="Le serveur ne répond pas. Vos données ne sont pas perdues."
 *     code="NETWORK_ERROR" :retrying="loading" @retry="load" />
 */
import BaseButton from './BaseButton.vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    /** Code technique facultatif (affiché discrètement, utile en démonstration). */
    code?: string
    icon?: IconName
    retryLabel?: string
    /** Cache le bouton « Réessayer » (ex. accès refusé : réessayer ne sert à rien). */
    hideRetry?: boolean
    /** Désactive le bouton et affiche un indicateur pendant la nouvelle tentative. */
    retrying?: boolean
    compact?: boolean
  }>(),
  {
    title: 'Une erreur est survenue',
    message: 'Le contenu n’a pas pu être chargé. Vous pouvez réessayer dans un instant.',
    code: undefined,
    icon: 'alert-circle',
    retryLabel: 'Réessayer',
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error-state" :class="{ 'error-state--compact': compact }" role="alert">
    <span class="error-state__icon"><BaseIcon :name="icon" :size="compact ? 24 : 32" /></span>
    <p class="error-state__title">{{ title }}</p>
    <p class="error-state__message">{{ message }}</p>
    <p v-if="code" class="error-state__code">
      Code : <code>{{ code }}</code>
    </p>
    <div class="error-state__actions">
      <BaseButton
        v-if="!hideRetry"
        variant="secondary"
        icon="refresh"
        :loading="retrying"
        @click="$emit('retry')"
      >
        {{ retryLabel }}
      </BaseButton>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.error-state--compact {
  padding: var(--space-6) var(--space-4);
}

.error-state__icon {
  display: inline-flex;
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}

.error-state__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.error-state__message {
  max-width: 30rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.error-state__code {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.error-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.error-state__actions:empty {
  display: none;
}
</style>
