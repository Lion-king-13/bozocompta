<script setup lang="ts">
/**
 * Répartition d'un total en une barre empilée + légende (pastille, libellé, valeur, part).
 * La légende écrit tout en texte : la couleur n'est jamais le seul indice.
 *
 *   <StackedBar title="Répartition des dépenses imputées" :items="items" />
 */
import { computed } from 'vue'
import { formatBasisPoints, formatCents, ratioBp } from '@/core/money'
import ChartDataTable from './ChartDataTable.vue'
import { seriesColor, type ChartDatum } from './chartUtils'

const props = withDefaults(
  defineProps<{
    title: string
    items: ChartDatum[]
    format?: (value: number) => string
    valueLabel?: string
    emptyText?: string
  }>(),
  {
    format: (v: number) => formatCents(v),
    valueLabel: 'Montant',
    emptyText: 'Aucune donnée pour cette période.',
  },
)

const visible = computed(() => props.items.filter((i) => i.value > 0))
const total = computed(() => visible.value.reduce((acc, i) => acc + i.value, 0))
const share = (value: number) => formatBasisPoints(ratioBp(value, total.value))
const rows = computed(() =>
  visible.value.map((i) => [i.fullLabel ?? i.label, props.format(i.value), share(i.value)]),
)
</script>

<template>
  <figure class="stack-bar" :aria-label="title" data-testid="stacked-bar">
    <p v-if="visible.length === 0" class="chart-empty">{{ emptyText }}</p>
    <template v-else>
      <svg width="100%" height="20" aria-hidden="true" focusable="false" class="stack-bar__svg">
        <svg
          v-for="(seg, i) in visible"
          :key="seg.key"
          :x="`${(visible.slice(0, i).reduce((a, s) => a + s.value, 0) / total) * 100}%`"
          :width="`${(seg.value / total) * 100}%`"
          height="20"
        >
          <!-- 2 px d'écart entre segments : un trait de la couleur de fond -->
          <rect width="100%" height="20" :fill="seriesColor(seg.colorSlot)" rx="4" />
          <rect v-if="i > 0" width="2" height="20" fill="var(--color-surface)" />
        </svg>
      </svg>
      <ul class="stack-bar__legend">
        <li v-for="seg in visible" :key="seg.key">
          <span class="swatch" :style="{ background: seriesColor(seg.colorSlot) }" />
          <span class="stack-bar__label">{{ seg.fullLabel ?? seg.label }}</span>
          <span class="stack-bar__value tabular-nums">
            {{ format(seg.value) }} · {{ share(seg.value) }}
          </span>
        </li>
      </ul>
      <ChartDataTable :caption="title" :columns="['Libellé', valueLabel, 'Part']" :rows="rows" />
    </template>
  </figure>
</template>

<style scoped>
.stack-bar {
  margin: 0;
  min-width: 0;
}
.stack-bar__svg {
  display: block;
}
.stack-bar__legend {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.stack-bar__legend li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 3px;
  flex: none;
}
.stack-bar__label {
  flex: 1;
  min-width: 8rem;
}
.stack-bar__value {
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.chart-empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
