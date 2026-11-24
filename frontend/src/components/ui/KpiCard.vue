<script setup lang="ts">
/**
 * Carte d'indicateur clé : libellé, valeur, variation.
 * La valeur arrive DÉJÀ formatée (ex. formatCents(300000) → « 3 000,00 € ») :
 * le composant ne fait aucun calcul financier.
 *
 *   <KpiCard label="Dépenses du mois" value="48 230,00 €"
 *     :variation="12.4" variation-label="vs octobre" trend="up-is-bad" />
 *
 * La variation est dite en toutes lettres (« en hausse de 12,4 % ») : la couleur
 * et la flèche ne sont qu'un renfort.
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    /** Variation en pourcentage (12.4 = +12,4 %). */
    variation?: number
    variationLabel?: string
    /**
     * Sens favorable : pour une dépense, une hausse est défavorable ('up-is-bad').
     * 'neutral' : pas de jugement (gris).
     */
    trend?: 'up-is-bad' | 'up-is-good' | 'neutral'
    /** Ligne d'information complémentaire, ex. « 3 factures à valider ». */
    hint?: string
    icon?: IconName
  }>(),
  {
    variation: undefined,
    variationLabel: undefined,
    trend: 'up-is-bad',
    hint: undefined,
    icon: undefined,
  },
)

const percentFormatter = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 1 })

const change = computed(() => {
  const v = props.variation
  if (v === undefined) return null
  const direction = v > 0 ? 'up' : v < 0 ? 'down' : 'flat'
  let tone: 'good' | 'bad' | 'neutral' = 'neutral'
  if (direction !== 'flat' && props.trend !== 'neutral') {
    const upIsGood = props.trend === 'up-is-good'
    tone = (direction === 'up') === upIsGood ? 'good' : 'bad'
  }
  const amount = `${percentFormatter.format(Math.abs(v))} %`
  const text =
    direction === 'up'
      ? `En hausse de ${amount}`
      : direction === 'down'
        ? `En baisse de ${amount}`
        : 'Stable'
  const icon: IconName =
    direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'minus'
  return { tone, text, icon }
})
</script>

<template>
  <div class="kpi">
    <div class="kpi__header">
      <p class="kpi__label">{{ label }}</p>
      <span v-if="icon" class="kpi__icon"><BaseIcon :name="icon" :size="18" /></span>
    </div>
    <p class="kpi__value">{{ value }}</p>
    <p v-if="change" :class="['kpi__change', `kpi__change--${change.tone}`]">
      <BaseIcon :name="change.icon" :size="14" />
      <span>{{ change.text }}</span>
      <span v-if="variationLabel" class="kpi__change-label">{{ variationLabel }}</span>
    </p>
    <p v-if="hint || $slots.default" class="kpi__hint">
      <slot>{{ hint }}</slot>
    </p>
  </div>
</template>

<style scoped>
.kpi {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.kpi__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.kpi__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.kpi__icon {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.kpi__value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  line-height: var(--line-height-tight);
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.kpi__change {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.kpi__change--good {
  color: var(--color-success-text);
}
.kpi__change--bad {
  color: var(--color-danger-text);
}
.kpi__change--neutral {
  color: var(--color-text-secondary);
}

.kpi__change-label {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}

@media (min-width: 768px) {
  .kpi__value {
    font-size: var(--font-size-3xl);
  }
}

.kpi__hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
