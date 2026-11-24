<script setup lang="ts">
/**
 * Bannière d'alerte dans la page (erreur de quota, IA indisponible, information…).
 * <BaseAlert tone="warning" title="Quota IA bientôt atteint">
 *   Il vous reste 12 extractions ce mois-ci.
 *   <template #actions><BaseButton size="sm" variant="secondary">Voir la consommation</BaseButton></template>
 * </BaseAlert>
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { TONE_ICON } from './catalog'
import type { Tone } from './types'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    title?: string
    /** Affiche un bouton « Fermer » qui émet `dismiss`. */
    dismissible?: boolean
    /**
     * Annonce l'alerte aux lecteurs d'écran dès son apparition.
     * À activer pour une alerte qui apparaît suite à une action (pas pour un contenu statique).
     */
    live?: boolean
  }>(),
  { tone: 'info', title: undefined },
)

defineEmits<{ dismiss: [] }>()

// Les erreurs interrompent (alert) ; les autres messages attendent un moment calme (status).
const role = computed(() => {
  if (!props.live) return undefined
  return props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status'
})
</script>

<template>
  <div :class="['alert', `alert--${tone}`]" :role="role">
    <BaseIcon class="alert__icon" :name="TONE_ICON[tone]" :size="20" />
    <div class="alert__content">
      <p v-if="title" class="alert__title">{{ title }}</p>
      <div v-if="$slots.default" class="alert__message"><slot /></div>
      <div v-if="$slots.actions" class="alert__actions"><slot name="actions" /></div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="alert__dismiss"
      aria-label="Fermer le message"
      @click="$emit('dismiss')"
    >
      <BaseIcon name="x" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid;
  border-left-width: 4px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.alert__icon {
  margin-top: 1px;
}

.alert__content {
  flex: 1;
  min-width: 0;
}

.alert__title {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-md);
  line-height: var(--line-height-snug);
}

.alert__message {
  color: var(--color-text);
}

.alert__title + .alert__message {
  margin-top: var(--space-1);
}

.alert__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.alert__dismiss {
  display: inline-flex;
  padding: var(--space-1);
  margin: calc(var(--space-1) * -1);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
}

.alert__dismiss:focus-visible {
  outline: var(--focus-outline);
}

.alert--neutral {
  background: var(--color-neutral-bg);
  border-color: var(--color-neutral-border);
  color: var(--color-neutral-text);
}
.alert--info {
  background: var(--color-info-bg);
  border-color: var(--color-info-border);
  border-left-color: var(--color-info-solid);
  color: var(--color-info-text);
}
.alert--success {
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
  border-left-color: var(--color-success-solid);
  color: var(--color-success-text);
}
.alert--warning {
  background: var(--color-warning-bg);
  border-color: var(--color-warning-border);
  border-left-color: var(--color-warning-solid);
  color: var(--color-warning-text);
}
.alert--danger {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  border-left-color: var(--color-danger-solid);
  color: var(--color-danger-text);
}
</style>
