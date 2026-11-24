<script setup lang="ts">
/** Page provisoire : indique ce que la vue devra faire et quels services utiliser. */
defineProps<{
  title: string
  description: string
  services?: string
}>()
</script>

<template>
  <section class="placeholder" data-testid="placeholder-page">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <p v-if="services" class="services">
      Services : <code>{{ services }}</code>
    </p>
    <p class="note">Vue provisoire — à implémenter.</p>
  </section>
</template>

<style scoped>
.placeholder {
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  max-width: 60rem;
}
.services,
.note {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
