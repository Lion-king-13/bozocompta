<script setup lang="ts">
/**
 * Légende des provenances (transparence IA), affichée en haut des écrans de correction si la
 * préférence « Afficher la légende de provenance IA » est active (QA-21).
 * Libellés et explications : source unique `domain/provenance.ts` (QA-22).
 */
import { AiProvenanceBadge } from '@/components/ui'
import { usePreferences } from '@/composables/usePreferences'
import { PROVENANCE_DESCRIPTIONS, PROVENANCE_ORDER } from '@/domain'

const preferences = usePreferences()
</script>

<template>
  <details v-if="preferences.showAiLegend" class="legend" data-testid="provenance-legend">
    <summary>Que signifient les badges de provenance ?</summary>
    <dl>
      <div v-for="p in PROVENANCE_ORDER" :key="p" class="legend__item">
        <dt><AiProvenanceBadge :provenance="p" size="sm" /></dt>
        <dd>{{ PROVENANCE_DESCRIPTIONS[p] }}</dd>
      </div>
    </dl>
  </details>
</template>

<style scoped>
.legend {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
}
.legend summary {
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  min-height: var(--control-height-sm);
  display: flex;
  align-items: center;
}
.legend dl {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
}
.legend__item {
  display: grid;
  gap: var(--space-1) var(--space-3);
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 640px) {
  .legend__item {
    grid-template-columns: 11rem minmax(0, 1fr);
    align-items: center;
  }
}
.legend dd {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
