<script setup lang="ts">
/**
 * Évolution dans le temps, une seule série : courbe (`variant="line"`) ou colonnes
 * (`variant="column"`). Dessin en pixels réels (largeur mesurée) pour garder des textes
 * lisibles à 360 px. Chaque point / colonne est focusable au clavier et affiche une
 * infobulle « libellé : valeur » ; le tableau « Voir les données » reprend tout.
 *
 *   <TimeSeriesChart title="Évolution mensuelle" :points="points" variant="line" />
 */
import { computed, ref } from 'vue'
import { formatCents } from '@/core/money'
import ChartDataTable from './ChartDataTable.vue'
import { axisTicks, labelStep, niceMax, seriesColor, type ChartDatum } from './chartUtils'
import { useElementWidth } from './useElementWidth'

const props = withDefaults(
  defineProps<{
    title: string
    points: ChartDatum[]
    variant?: 'line' | 'column'
    format?: (value: number) => string
    /** Formatage compact des graduations (défaut : `format`). */
    formatTick?: (value: number) => string
    valueLabel?: string
    periodLabel?: string
    emptyText?: string
    height?: number
  }>(),
  {
    variant: 'line',
    format: (v: number) => formatCents(v),
    formatTick: undefined,
    valueLabel: 'Montant',
    periodLabel: 'Période',
    emptyText: 'Aucune donnée pour cette période.',
    height: 220,
  },
)

const container = ref<HTMLElement | null>(null)
const width = useElementWidth(container)
const active = ref<number | null>(null)

const tickFormat = computed(() => props.formatTick ?? props.format)
const max = computed(() => niceMax(Math.max(0, ...props.points.map((p) => p.value))))
const ticks = computed(() => axisTicks(max.value))

// Marges : la marge gauche s'adapte à la longueur des graduations (≈ 7 px par caractère).
const left = computed(
  () => 12 + 7 * Math.max(...ticks.value.map((t) => tickFormat.value(t).length)),
)
const top = 12
const bottom = 28
const right = 12
const plotW = computed(() => Math.max(40, width.value - left.value - right))
const plotH = computed(() => props.height - top - bottom)

const slot = computed(() => (props.points.length ? plotW.value / props.points.length : 0))
const xCenter = (i: number) => left.value + slot.value * (i + 0.5)
const y = (v: number) => top + plotH.value - (v / max.value) * plotH.value
const step = computed(() => labelStep(props.points.length, plotW.value, 52))

const linePath = computed(() =>
  props.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i)},${y(p.value)}`).join(' '),
)
const barWidth = computed(() => Math.max(2, Math.min(32, slot.value * 0.7)))

function describe(p: ChartDatum): string {
  return `${p.fullLabel ?? p.label} : ${props.format(p.value)}`
}

const tooltip = computed(() => {
  if (active.value === null) return null
  const p = props.points[active.value]
  if (!p) return null
  const x = xCenter(active.value)
  return {
    text: describe(p),
    left: Math.min(Math.max(x, 70), width.value - 70),
    top: Math.max(0, y(p.value) - 8),
  }
})

const rows = computed(() =>
  props.points.map((p) => [p.fullLabel ?? p.label, props.format(p.value)]),
)
const color = seriesColor(1)

const lastLabel = computed(() => {
  const i = props.points.length - 1
  const p = props.points[i]
  if (!p || active.value !== null) return null
  const x = xCenter(i)
  const nearRight = x > width.value - 90
  return {
    text: props.format(p.value),
    x: nearRight ? x - 10 : x,
    y: Math.max(top + 10, y(p.value) - 10),
    anchor: nearRight ? 'end' : 'middle',
  }
})
</script>

<template>
  <figure ref="container" class="ts" data-testid="timeseries-chart">
    <p v-if="points.length === 0" class="chart-empty">{{ emptyText }}</p>
    <template v-else>
      <svg
        :width="width"
        :height="height"
        role="group"
        :aria-label="title"
        class="ts__svg"
        @mouseleave="active = null"
      >
        <!-- Grille et graduations (discrètes) -->
        <g class="ts__grid" aria-hidden="true">
          <g v-for="t in ticks" :key="t">
            <line :x1="left" :x2="left + plotW" :y1="y(t)" :y2="y(t)" />
            <text :x="left - 6" :y="y(t)" dy="0.32em" text-anchor="end">{{ tickFormat(t) }}</text>
          </g>
          <line class="ts__axis" :x1="left" :x2="left + plotW" :y1="y(0)" :y2="y(0)" />
          <template v-for="(p, i) in points" :key="p.key">
            <text v-if="i % step === 0" :x="xCenter(i)" :y="top + plotH + 18" text-anchor="middle">
              {{ p.label }}
            </text>
          </template>
        </g>

        <path
          v-if="variant === 'line'"
          :d="linePath"
          fill="none"
          :stroke="color"
          stroke-width="2"
          stroke-linejoin="round"
          aria-hidden="true"
        />
        <!-- Étiquette directe sélective : seulement la dernière valeur de la courbe -->
        <text
          v-if="variant === 'line' && lastLabel"
          class="ts__direct"
          :x="lastLabel.x"
          :y="lastLabel.y"
          :text-anchor="lastLabel.anchor"
          aria-hidden="true"
        >
          {{ lastLabel.text }}
        </text>

        <g
          v-for="(p, i) in points"
          :key="p.key"
          class="ts__mark"
          tabindex="0"
          role="img"
          :aria-label="describe(p)"
          data-testid="timeseries-mark"
          @mouseenter="active = i"
          @focus="active = i"
          @blur="active = null"
        >
          <!-- Zone de survol plus large que la marque -->
          <rect
            :x="xCenter(i) - slot / 2"
            :y="top"
            :width="slot"
            :height="plotH"
            fill="transparent"
          />
          <rect
            v-if="variant === 'column' && p.value > 0"
            :x="xCenter(i) - barWidth / 2"
            :y="y(p.value)"
            :width="barWidth"
            :height="Math.max(1, y(0) - y(p.value))"
            rx="2"
            :fill="color"
          />
          <circle
            v-if="variant === 'line'"
            :cx="xCenter(i)"
            :cy="y(p.value)"
            :r="active === i ? 6 : 4"
            :fill="color"
            stroke="var(--color-surface)"
            stroke-width="2"
          />
        </g>
      </svg>
      <div
        v-if="tooltip"
        class="ts__tooltip"
        role="status"
        :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
      >
        {{ tooltip.text }}
      </div>
      <ChartDataTable :caption="title" :columns="[periodLabel, valueLabel]" :rows="rows" />
    </template>
  </figure>
</template>

<style scoped>
.ts {
  position: relative;
  margin: 0;
  min-width: 0;
  width: 100%;
}
.ts__svg {
  display: block;
  overflow: visible;
}
.ts__grid line {
  stroke: var(--chart-grid);
  stroke-width: 1;
}
.ts__grid .ts__axis {
  stroke: var(--chart-axis);
}
.ts__grid text {
  fill: var(--color-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ts__direct {
  fill: var(--color-text);
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.ts__mark {
  outline: none;
  cursor: default;
}
.ts__mark:focus-visible circle,
.ts__mark:focus-visible rect:not([fill='transparent']) {
  stroke: var(--color-focus);
  stroke-width: 3;
}
.ts__tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: var(--color-text);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}
.chart-empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
