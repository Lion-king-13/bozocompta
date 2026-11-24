<script setup lang="ts">
/** Page provisoire : indique ce que la vue devra faire et quels services utiliser. */
import PageHeader from '@/components/ui/PageHeader.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

defineProps<{
  title: string
  description: string
  services?: string
}>()
</script>

<template>
  <section class="placeholder" data-testid="placeholder-page">
    <PageHeader :title="title" :description="description" />
    <div class="placeholder__box">
      <BaseIcon name="pencil" :size="24" />
      <div>
        <p class="placeholder__title">Écran en cours de réalisation</p>
        <p v-if="services" class="placeholder__services">
          Services : <code>{{ services }}</code>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.placeholder__box {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.placeholder__title {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.placeholder__services {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
}
</style>
