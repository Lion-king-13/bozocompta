<script setup lang="ts">
/**
 * Carte : conteneur blanc bordé. Titre facultatif, actions à droite, pied de carte.
 * Utilisation : <BaseCard title="Budgets"> … <template #actions>…</template></BaseCard>
 */
import { useId } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Niveau du titre (h2 par défaut, h3 dans une section déjà titrée). */
    headingLevel?: 2 | 3 | 4
    /** Supprime le padding interne (ex. tableau collé aux bords). */
    flush?: boolean
    /** Balise racine : 'section' quand la carte a un titre, sinon 'div'. */
    as?: 'section' | 'div' | 'article'
  }>(),
  { title: undefined, description: undefined, headingLevel: 2, as: undefined },
)

const titleId = useId()
</script>

<template>
  <component
    :is="as ?? (title ? 'section' : 'div')"
    class="card"
    :aria-labelledby="title ? titleId : undefined"
  >
    <header v-if="title || $slots.header || $slots.actions" class="card__header">
      <div class="card__heading">
        <slot name="header">
          <component :is="`h${headingLevel}`" :id="titleId" class="card__title">{{
            title
          }}</component>
          <p v-if="description" class="card__description">{{ description }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="card__body" :class="{ 'card__body--flush': flush }">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) 0;
}

.card__heading {
  min-width: 0;
}

.card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.card__description {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card__body {
  flex: 1;
  padding: var(--space-4);
}

.card__body--flush {
  padding: var(--space-4) 0 0;
}

.card__footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--font-size-sm);
}

@media (min-width: 768px) {
  .card__header {
    padding: var(--space-5) var(--space-6) 0;
  }
  .card__body {
    padding: var(--space-5) var(--space-6) var(--space-6);
  }
  .card__body--flush {
    padding: var(--space-4) 0 0;
    --data-table-edge: var(--space-6); /* aligne un DataTable sur le titre de la carte */
  }
  .card__footer {
    padding: var(--space-3) var(--space-6);
  }
}
</style>
