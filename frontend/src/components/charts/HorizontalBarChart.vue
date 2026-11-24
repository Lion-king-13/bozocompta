<script setup lang="ts">
/**
 * Barres horizontales : une ligne = libellé + valeur écrite + barre proportionnelle.
 * Les valeurs sont TOUJOURS écrites en texte (pas de dépendance à la couleur) ;
 * la barre n'est qu'un renfort visuel. Rendu identique de 360 à 1 280 px
 * (libellé et valeur au-dessus, barre en dessous).
 *
 *   <HorizontalBarChart title="Dépenses par catégorie" :items="items" />
 */
import { computed, useId } from 'vue'
import { formatCents } from '@/core/money'
import ChartDataTable from './ChartDataTable.vue'
import { percentOf, seriesColor, type ChartDatum } from './chartUtils'

const props = withDefaults(
  defineProps<{
    title: string
    items: ChartDatum[]
    /** Formatage des valeurs (défaut : montants en centimes → « 1 800,00 € »). */
    format?: (value: number) => string
    /** En-tête de la colonne des valeurs dans le tableau de données. */
    valueLabel?: string
    emptyText?: string
  }>(),
  {
    format: (v: number) => formatCents(v),
    valueLabel: 'Montant',
    emptyText: 'Aucune donnée pour cette période.',
  },
)

const patternId = `hatch-${useId()}`
const max = computed(() => Math.max(0, ...props.items.map((i) => i.value)))
const rows = computed(() =>
  props.items.map((i) => [
    i.sublabel ? `${i.fullLabel ?? i.label} (${i.sublabel})` : (i.fullLabel ?? i.label),
    props.format(i.value),
  ]),
)
</script>

<template>
  <figure class="hbar" :aria-label="title" data-testid="hbar-chart">
    <p v-if="items.length === 0" class="chart-empty">{{ emptyText }}</p>
    <ul v-else class="hbar__list">
      <li v-for="item in items" :key="item.key" class="hbar__row" data-testid="hbar-row">
        <div class="hbar__text">
          <span class="hbar__label">
            {{ item.label }}
            <span v-if="item.sublabel" class="hbar__sublabel">{{ item.sublabel }}</span>
          </span>
          <span class="hbar__value tabular-nums">{{ format(item.value) }}</span>
        </div>
        <svg class="hbar__track" width="100%" height="12" aria-hidden="true" focusable="false">
          <defs v-if="item.hatched">
            <pattern
              :id="`${patternId}-${item.key}`"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--color-surface)" />
              <rect width="3" height="6" :fill="seriesColor(item.colorSlot)" />
            </pattern>
          </defs>
          <rect class="hbar__bg" width="100%" height="12" rx="4" />
          <rect
            v-if="item.value > 0"
            :width="`${Math.max(1, percentOf(item.value, max))}%`"
            height="12"
            rx="4"
            :fill="item.hatched ? `url(#${patternId}-${item.key})` : seriesColor(item.colorSlot)"
            :stroke="item.hatched ? seriesColor(item.colorSlot) : 'none'"
          />
        </svg>
      </li>
    </ul>
    <ChartDataTable
      v-if="items.length"
      :caption="title"
      :columns="['Libellé', valueLabel]"
      :rows="rows"
    />
  </figure>
</template>

<style scoped>
.hbar {
  margin: 0;
  min-width: 0;
}
.hbar__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.hbar__text {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-1);
}
.hbar__label {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
}
.hbar__sublabel {
  color: var(--color-text-secondary);
  margin-left: var(--space-1);
}
.hbar__value {
  white-space: nowrap;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}
.hbar__track {
  display: block;
  overflow: visible;
}
.hbar__bg {
  fill: var(--color-surface-sunken);
}
.chart-empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
