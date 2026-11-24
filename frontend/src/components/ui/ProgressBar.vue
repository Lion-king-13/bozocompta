<script setup lang="ts">
/**
 * Barre de progression à seuils (budget consommé, quota IA utilisé).
 * L'état est TOUJOURS écrit en clair : « Seuil d'alerte atteint », « Dépassé de … ».
 *
 *   <ProgressBar label="Budget IT Belgique" :value="1800" :max="2000"
 *     value-text="1 800 € sur 2 000 €" />
 *
 * `value` et `max` sont dans la même unité (centimes, tokens, nombre d'extractions…).
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    max: number
    /** Texte lisible de la valeur, ex. « 1 800 € sur 2 000 € ». */
    valueText?: string
    /** Pourcentage déclenchant l'avertissement (défaut 80). */
    warningAt?: number
    /** Pourcentage considéré comme dépassement (défaut 100). */
    dangerAt?: number
    /** Masque l'en-tête visible (le libellé reste annoncé via aria-label). */
    hideLabel?: boolean
  }>(),
  { valueText: undefined, warningAt: 80, dangerAt: 100 },
)

const percent = computed(() => (props.max > 0 ? (props.value / props.max) * 100 : 0))
const roundedPercent = computed(() => Math.round(percent.value))

const state = computed<{ tone: 'ok' | 'warning' | 'danger'; text: string; icon: IconName }>(() => {
  if (percent.value > props.dangerAt)
    return { tone: 'danger', text: 'Dépassé', icon: 'alert-circle' }
  if (percent.value >= props.dangerAt)
    return { tone: 'danger', text: 'Limite atteinte', icon: 'alert-circle' }
  if (percent.value >= props.warningAt)
    return { tone: 'warning', text: "Seuil d'alerte atteint", icon: 'alert-triangle' }
  return { tone: 'ok', text: 'Dans la limite', icon: 'check' }
})

const ariaValueText = computed(
  () =>
    `${props.valueText ?? `${roundedPercent.value} %`}, ${roundedPercent.value} %. ${state.value.text}.`,
)
</script>

<template>
  <div :class="['progress', `progress--${state.tone}`]">
    <!-- Texte visible doublé par aria-label / aria-valuetext : masqué aux lecteurs d'écran -->
    <div v-if="!hideLabel" class="progress__header" aria-hidden="true">
      <span class="progress__label">{{ label }}</span>
      <span class="progress__percent">{{ roundedPercent }} %</span>
    </div>
    <div
      class="progress__track"
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="Math.min(value, max)"
      :aria-valuetext="ariaValueText"
    >
      <span class="progress__fill" :style="{ width: `${Math.min(percent, 100)}%` }" />
      <!-- Repère visuel du seuil d'alerte -->
      <span class="progress__marker" :style="{ left: `${warningAt}%` }" aria-hidden="true" />
    </div>
    <div class="progress__footer" aria-hidden="true">
      <span v-if="valueText" class="progress__value">{{ valueText }}</span>
      <span class="progress__state">
        <BaseIcon :name="state.icon" :size="14" />
        {{ state.text }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.progress__header,
.progress__footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
}

.progress__label {
  font-weight: var(--font-weight-medium);
}

.progress__percent,
.progress__value {
  font-variant-numeric: tabular-nums;
}

.progress__value {
  color: var(--color-text-secondary);
}

.progress__track {
  position: relative;
  height: 0.625rem;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  box-shadow: inset 0 0 0 1px var(--color-border-subtle);
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  transition: width var(--duration-slow) var(--easing-standard);
}

.progress__marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-surface);
}

.progress--warning .progress__fill {
  background: var(--color-warning-solid);
}

/* Dépassement : rouge + hachures (lisible sans la couleur) */
.progress--danger .progress__fill {
  background: repeating-linear-gradient(
    135deg,
    var(--color-danger-solid) 0 6px,
    var(--color-danger-text) 6px 10px
  );
}

.progress__state {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: var(--font-weight-medium);
  color: var(--color-success-text);
}

.progress--warning .progress__state {
  color: var(--color-warning-text);
}

.progress--danger .progress__state {
  color: var(--color-danger-text);
}
</style>
