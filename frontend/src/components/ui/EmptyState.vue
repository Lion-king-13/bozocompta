<script setup lang="ts">
/**
 * État vide : explique pourquoi il n'y a rien et propose l'action suivante.
 * <EmptyState icon="receipt" title="Aucune facture pour l'instant"
 *   description="Importez une facture PDF pour que l'IA en extraie les informations.">
 *   <template #actions><BaseButton icon="upload">Importer une facture</BaseButton></template>
 * </EmptyState>
 */
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: IconName
    /** Version compacte, pour l'intérieur d'une carte ou d'un tableau. */
    compact?: boolean
  }>(),
  { description: undefined, icon: 'inbox' },
)
</script>

<template>
  <div class="empty" :class="{ 'empty--compact': compact }">
    <span class="empty__icon"><BaseIcon :name="icon" :size="compact ? 24 : 32" /></span>
    <p class="empty__title">{{ title }}</p>
    <p v-if="description" class="empty__description">{{ description }}</p>
    <div v-if="$slots.actions" class="empty__actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.empty--compact {
  padding: var(--space-6) var(--space-4);
}

.empty__icon {
  display: inline-flex;
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.empty__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.empty__description {
  max-width: 28rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>
