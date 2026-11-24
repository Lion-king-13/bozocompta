<script setup lang="ts">
/**
 * Légende des cinq provenances (transparence IA, QA-21). À poser en haut des écrans où des
 * badges de provenance apparaissent (correction d'une facture extraite, détail…), sous
 * condition de la préférence `showAiLegend` (`usePreferences()`).
 * Libellés et explications : `domain/provenance.ts` (via le catalogue).
 *
 *   <AiProvenanceLegend v-if="preferences.showAiLegend" />
 */
import { useId } from 'vue'
import AiProvenanceBadge from './AiProvenanceBadge.vue'
import { AI_PROVENANCE, AI_PROVENANCE_ORDER } from './catalog'

withDefaults(
  defineProps<{
    /** Titre affiché (et nom de la région pour les lecteurs d'écran). */
    title?: string
    /** Disposition compacte : badges en ligne, explication au survol / lecteur d'écran. */
    compact?: boolean
  }>(),
  { title: 'Provenance des informations' },
)

const titleId = useId()
</script>

<template>
  <section
    class="legend"
    :class="{ 'legend--compact': compact }"
    :aria-labelledby="titleId"
    data-testid="ai-legend"
  >
    <p :id="titleId" class="legend__title">{{ title }}</p>
    <ul class="legend__list">
      <li v-for="kind in AI_PROVENANCE_ORDER" :key="kind" class="legend__item">
        <AiProvenanceBadge :provenance="kind" size="sm" />
        <span v-if="!compact" class="legend__text">{{ AI_PROVENANCE[kind].description }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.legend {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.legend__title {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.legend__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.legend--compact .legend__list {
  flex-direction: row;
  flex-wrap: wrap;
}

.legend__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-3);
}

.legend__text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
