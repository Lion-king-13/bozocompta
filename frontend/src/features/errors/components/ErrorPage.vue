<script setup lang="ts">
/** Mise en page commune des pages d'erreur (accès refusé, page introuvable). */
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { IconName } from '@/components/ui/icons'

defineProps<{ icon: IconName; code: string; title: string }>()
</script>

<template>
  <section class="error-page" aria-labelledby="error-page-title">
    <div class="error-page__card">
      <span class="error-page__icon"><BaseIcon :name="icon" :size="32" /></span>
      <p class="error-page__code">{{ code }}</p>
      <h1 id="error-page-title" class="error-page__title">{{ title }}</h1>
      <div class="error-page__text"><slot /></div>
      <div class="error-page__actions"><slot name="actions" /></div>
    </div>
  </section>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-12) var(--page-gutter);
}

.error-page__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 34rem;
  padding: var(--space-10) var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.error-page__icon {
  display: inline-flex;
  padding: var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.error-page__code {
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.error-page__title {
  margin-top: var(--space-2);
  font-size: var(--font-size-2xl);
}

.error-page__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.error-page__actions :deep(a) {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-height);
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.error-page__actions :deep(a.is-primary) {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.error-page__actions :deep(a:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}
</style>
