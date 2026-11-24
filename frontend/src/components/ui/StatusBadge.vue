<script setup lang="ts">
/**
 * Badge de statut métier. Toujours : couleur + icône + texte.
 *   <StatusBadge status="missing_receipt" />            (catalogue BUSINESS_STATUS)
 *   <StatusBadge tone="warning" label="3 jours de retard" icon="clock" />   (libre)
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { BUSINESS_STATUS, TONE_ICON, type BusinessStatus } from './catalog'
import type { IconName } from './icons'
import type { Tone } from './types'

const props = withDefaults(
  defineProps<{
    /** Statut connu du catalogue (fixe libellé, ton et icône). */
    status?: BusinessStatus
    /** Sinon : ton + libellé libres. */
    tone?: Tone
    label?: string
    icon?: IconName
    size?: 'md' | 'sm'
  }>(),
  { status: undefined, tone: 'neutral', label: undefined, icon: undefined, size: 'md' },
)

const resolved = computed(() => {
  const fromCatalog = props.status ? BUSINESS_STATUS[props.status] : undefined
  const tone: Tone = fromCatalog?.tone ?? props.tone
  return {
    tone,
    label: props.label ?? fromCatalog?.label ?? '',
    icon: props.icon ?? fromCatalog?.icon ?? TONE_ICON[tone],
  }
})
</script>

<template>
  <span :class="['status-badge', `status-badge--${resolved.tone}`, `status-badge--${size}`]">
    <BaseIcon :name="resolved.icon" :size="size === 'sm' ? 12 : 14" />
    <span>{{ resolved.label }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border: 1px solid;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  white-space: nowrap;
}

.status-badge--md {
  font-size: var(--font-size-sm);
  padding: 2px var(--space-2) 2px 6px;
}

.status-badge--sm {
  padding: 0 6px;
}

.status-badge--neutral {
  color: var(--color-neutral-text);
  background: var(--color-neutral-bg);
  border-color: var(--color-neutral-border);
}
.status-badge--info {
  color: var(--color-info-text);
  background: var(--color-info-bg);
  border-color: var(--color-info-border);
}
.status-badge--success {
  color: var(--color-success-text);
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
}
.status-badge--warning {
  color: var(--color-warning-text);
  background: var(--color-warning-bg);
  border-color: var(--color-warning-border);
}
.status-badge--danger {
  color: var(--color-danger-text);
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
}
</style>
