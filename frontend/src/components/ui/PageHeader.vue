<script setup lang="ts">
/**
 * En-tête de page : fil d'Ariane, titre (h1 unique de la page), description, actions.
 *   <PageHeader title="Factures" description="Factures importées et leur statut de validation.">
 *     <template #actions><BaseButton icon="upload">Importer une facture</BaseButton></template>
 *   </PageHeader>
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="page-header">
    <nav v-if="$slots.breadcrumb" class="page-header__breadcrumb" aria-label="Fil d'Ariane">
      <slot name="breadcrumb" />
    </nav>
    <div class="page-header__row">
      <div class="page-header__text">
        <div class="page-header__title-row">
          <h1 class="page-header__title">{{ title }}</h1>
          <!-- Badges à côté du titre : statut de la facture, provenance… -->
          <slot name="meta" />
        </div>
        <p v-if="description" class="page-header__description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.page-header__breadcrumb {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.page-header__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-header__text {
  min-width: 0;
}

.page-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
}

.page-header__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.page-header__description {
  margin-top: var(--space-1);
  max-width: 48rem;
  color: var(--color-text-secondary);
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (min-width: 768px) {
  .page-header__row {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .page-header__actions {
    flex-shrink: 0;
  }
}
</style>
