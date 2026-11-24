<script setup lang="ts">
/**
 * Pagination. Desktop : numéros de page ; mobile : « Page 2 sur 8 » + précédent/suivant.
 *   <BasePagination v-model:page="page" :page-count="8" :total="152" item-label="factures" />
 */
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'

const page = defineModel<number>('page', { required: true })

const props = withDefaults(
  defineProps<{
    pageCount: number
    /** Nombre total d'éléments (facultatif, affiché à gauche). */
    total?: number
    /** Nom des éléments au pluriel, ex. « factures ». */
    itemLabel?: string
  }>(),
  { total: undefined, itemLabel: 'éléments' },
)

/** Pages affichées : 1 … 4 5 6 … 12 (null = points de suspension). */
const pages = computed<(number | null)[]>(() => {
  const count = props.pageCount
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const current = page.value
  const result: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(count - 1, current + 1)
  if (start > 2) result.push(null)
  for (let p = start; p <= end; p++) result.push(p)
  if (end < count - 1) result.push(null)
  result.push(count)
  return result
})

function goTo(target: number) {
  if (target >= 1 && target <= props.pageCount && target !== page.value) page.value = target
}
</script>

<template>
  <nav v-if="pageCount > 1" class="pagination" aria-label="Pagination">
    <p v-if="total !== undefined" class="pagination__total">{{ total }} {{ itemLabel }}</p>

    <div class="pagination__controls">
      <button
        type="button"
        class="pagination__button"
        :disabled="page <= 1"
        aria-label="Page précédente"
        @click="goTo(page - 1)"
      >
        <BaseIcon name="chevron-left" :size="18" />
      </button>

      <ul class="pagination__pages">
        <li v-for="(p, index) in pages" :key="p ?? `gap-${index}`">
          <span v-if="p === null" class="pagination__gap" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="pagination__button"
            :class="{ 'is-current': p === page }"
            :aria-current="p === page ? 'page' : undefined"
            :aria-label="`Page ${p}`"
            @click="goTo(p)"
          >
            {{ p }}
          </button>
        </li>
      </ul>

      <p class="pagination__compact" aria-live="polite">Page {{ page }} sur {{ pageCount }}</p>

      <button
        type="button"
        class="pagination__button"
        :disabled="page >= pageCount"
        aria-label="Page suivante"
        @click="goTo(page + 1)"
      >
        <BaseIcon name="chevron-right" :size="18" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}

.pagination__total {
  color: var(--color-text-secondary);
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
}

.pagination__pages {
  display: none;
  gap: var(--space-1);
  padding: 0;
  list-style: none;
}

.pagination__compact {
  padding: 0 var(--space-2);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 640px) {
  .pagination__pages {
    display: flex;
  }
  .pagination__compact {
    /* Reste annoncé aux lecteurs d'écran, masqué visuellement */
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}

.pagination__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--control-height);
  height: var(--control-height);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-variant-numeric: tabular-nums;
}

.pagination__button:hover:not(:disabled) {
  border-color: var(--color-border-strong);
}

.pagination__button:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.pagination__button:disabled {
  opacity: 0.45;
}

.pagination__button.is-current {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: var(--font-weight-semibold);
}

.pagination__gap {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  min-width: var(--space-6);
  height: var(--control-height);
  color: var(--color-text-secondary);
}
</style>
