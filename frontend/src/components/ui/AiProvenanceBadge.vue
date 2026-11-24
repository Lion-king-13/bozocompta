<script setup lang="ts">
/**
 * Badge de provenance d'une donnée (transparence IA).
 * Cinq états distingués par la couleur ET l'icône ET le texte ET le style de bordure
 * (pointillée pour une suggestion, pleine foncée pour une donnée enregistrée).
 *   <AiProvenanceBadge provenance="extracted" detail="confiance élevée" />
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { AI_PROVENANCE } from './catalog'
import type { AiProvenance } from './types'

const props = withDefaults(
  defineProps<{
    provenance: AiProvenance
    /** Précision affichée après le libellé, ex. « par Alice », « 12/11/2026 ». */
    detail?: string
    size?: 'md' | 'sm'
  }>(),
  { detail: undefined, size: 'md' },
)

const info = computed(() => AI_PROVENANCE[props.provenance])
</script>

<template>
  <span
    :class="['ai-badge', `ai-badge--${provenance}`, `ai-badge--${size}`]"
    :title="info.description"
  >
    <BaseIcon :name="info.icon" :size="size === 'sm' ? 12 : 14" />
    <span>{{ info.label }}</span>
    <span v-if="detail" class="ai-badge__detail">· {{ detail }}</span>
    <!-- L'explication complète reste accessible sans survol -->
    <span class="sr-only">. {{ info.description }}</span>
  </span>
</template>

<style scoped>
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2) 2px 6px;
  border: 1px solid;
  border-radius: var(--radius-sm); /* angles vifs : se distingue des badges de statut (arrondis) */
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  white-space: nowrap;
}

.ai-badge--sm {
  padding: 0 6px 0 4px;
  font-size: var(--font-size-xs);
}

.ai-badge__detail {
  font-weight: var(--font-weight-regular);
}

.ai-badge--extracted {
  color: var(--color-ai-extracted-text);
  background: var(--color-ai-extracted-bg);
  border-color: var(--color-ai-extracted-border);
}

.ai-badge--suggested {
  color: var(--color-ai-suggested-text);
  background: var(--color-ai-suggested-bg);
  border: 1px dashed var(--color-ai-suggested-border);
}

.ai-badge--corrected {
  color: var(--color-ai-corrected-text);
  background: var(--color-ai-corrected-bg);
  border-color: var(--color-ai-corrected-border);
}

.ai-badge--validated {
  color: var(--color-ai-validated-text);
  background: var(--color-ai-validated-bg);
  border-color: var(--color-ai-validated-border);
}

.ai-badge--recorded {
  color: var(--color-ai-recorded-text);
  background: var(--color-ai-recorded-bg);
  border-color: var(--color-ai-recorded-border);
}
</style>
