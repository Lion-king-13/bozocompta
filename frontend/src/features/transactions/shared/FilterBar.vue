<script setup lang="ts">
/**
 * Barre de filtres repliable : ouverte par défaut sur grand écran, repliée sur mobile
 * (« Filtres (2 actifs) »). Les champs sont passés dans le slot.
 */
import { onMounted, ref } from 'vue'
import { BaseButton, BaseIcon } from '@/components/ui'

defineProps<{ activeCount: number }>()
defineEmits<{ clear: [] }>()

const open = ref(true)
onMounted(() => {
  open.value =
    typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 768px)').matches
})
</script>

<template>
  <details class="filters" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
    <summary class="filters__summary">
      <BaseIcon name="search" :size="16" />
      Filtres
      <span v-if="activeCount" class="filters__count"
        >({{ activeCount }} actif{{ activeCount > 1 ? 's' : '' }})</span
      >
    </summary>
    <div class="filters__grid">
      <slot />
    </div>
    <div v-if="activeCount" class="filters__actions">
      <BaseButton variant="ghost" size="sm" icon="x" @click="$emit('clear')"
        >Effacer les filtres</BaseButton
      >
    </div>
  </details>
</template>

<style scoped>
.filters {
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}
.filters__summary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  min-height: var(--control-height-sm);
}
.filters__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular, 400);
}
.filters__grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
  margin-top: var(--space-3);
}
.filters__actions {
  margin-top: var(--space-2);
  display: flex;
  justify-content: flex-end;
}
</style>
