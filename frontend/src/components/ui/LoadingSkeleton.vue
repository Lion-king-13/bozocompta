<script setup lang="ts">
/**
 * État de chargement « squelette » : la forme du contenu apparaît avant les données,
 * ce qui évite les sauts de mise en page.
 *   <LoadingSkeleton variant="table" :rows="5" label="Chargement des factures" />
 *   <LoadingSkeleton variant="kpi" :count="4" />
 * Les blocs gris sont cachés aux lecteurs d'écran ; seul `label` est annoncé.
 */
withDefaults(
  defineProps<{
    variant?: 'text' | 'table' | 'kpi' | 'card'
    /** Lignes de texte ou de tableau. */
    rows?: number
    /** Nombre de cartes KPI. */
    count?: number
    label?: string
  }>(),
  { variant: 'text', rows: 3, count: 4, label: 'Chargement en cours…' },
)
</script>

<template>
  <div class="skeleton" role="status" aria-live="polite">
    <span class="sr-only">{{ label }}</span>

    <div v-if="variant === 'text'" aria-hidden="true" class="skeleton__text">
      <span
        v-for="n in rows"
        :key="n"
        class="skeleton__block skeleton__line"
        :style="{ width: n === rows ? '60%' : '100%' }"
      />
    </div>

    <div v-else-if="variant === 'table'" aria-hidden="true" class="skeleton__table">
      <span class="skeleton__block skeleton__row skeleton__row--head" />
      <span v-for="n in rows" :key="n" class="skeleton__block skeleton__row" />
    </div>

    <div v-else-if="variant === 'kpi'" aria-hidden="true" class="skeleton__kpis">
      <div v-for="n in count" :key="n" class="skeleton__kpi">
        <span class="skeleton__block skeleton__line" style="width: 50%" />
        <span class="skeleton__block skeleton__amount" />
        <span class="skeleton__block skeleton__line" style="width: 70%" />
      </div>
    </div>

    <div v-else aria-hidden="true" class="skeleton__card">
      <span class="skeleton__block skeleton__line" style="width: 40%; height: 1.25rem" />
      <span v-for="n in rows" :key="n" class="skeleton__block skeleton__line" />
    </div>
  </div>
</template>

<style scoped>
.skeleton__block {
  display: block;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-sunken) 0%,
    var(--palette-slate-50) 50%,
    var(--color-surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

/* Sans animation si l'utilisateur l'a demandé : bloc gris fixe */
@media (prefers-reduced-motion: reduce) {
  .skeleton__block {
    animation: none;
    background: var(--color-surface-sunken);
  }
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}

.skeleton__text,
.skeleton__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton__card {
  padding: var(--space-5);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.skeleton__line {
  height: 0.875rem;
}

.skeleton__table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skeleton__row {
  height: 2.75rem;
  border-radius: 0;
}

.skeleton__row--head {
  height: 2.25rem;
}

.skeleton__kpis {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
}

.skeleton__kpi {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.skeleton__amount {
  height: 2rem;
  width: 75%;
}
</style>
