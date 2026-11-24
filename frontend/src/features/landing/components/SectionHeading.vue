<script setup lang="ts">
/** Titre de section de la landing : sur-titre, titre h2, introduction. */
withDefaults(
  defineProps<{
    id: string
    eyebrow?: string
    title: string
    lead?: string
    align?: 'center' | 'left'
  }>(),
  { eyebrow: undefined, lead: undefined, align: 'center' },
)
</script>

<template>
  <header class="section-head" :class="`section-head--${align}`">
    <p v-if="eyebrow" class="section-head__eyebrow">{{ eyebrow }}</p>
    <h2 :id="id" class="section-head__title">{{ title }}</h2>
    <p v-if="lead" class="section-head__lead">{{ lead }}</p>
  </header>
</template>

<style scoped>
.section-head {
  max-width: 44rem;
}

.section-head--center {
  margin: 0 auto;
  text-align: center;
}

.section-head__eyebrow {
  margin-bottom: var(--space-3);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.section-head__title {
  font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.section-head__lead {
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
}
</style>
