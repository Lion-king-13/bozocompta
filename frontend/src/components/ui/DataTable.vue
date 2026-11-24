<script setup lang="ts" generic="T extends object">
/**
 * Tableau de données responsive.
 * La mise en page dépend de la largeur DISPONIBLE (container queries), pas de l'écran :
 * - ≥ 640 px de large : vrai <table>, colonnes numériques alignées à droite ;
 *   entre 640 et 896 px, les colonnes `hideOnMobile` sont masquées pour garder le montant visible ;
 * - < 640 px : chaque ligne devient une « fiche » (libellé : valeur), sans défilement horizontal.
 * Personnaliser une cellule : <template #cell-amount="{ row }">…</template>
 * Le tri n'est PAS fait ici : le composant émet `sort`, la page (ou le service) trie.
 */
import type { DataTableColumn, SortDirection } from './types'

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[]
    rows: T[]
    /** Propriété identifiant une ligne de façon unique (clé Vue). */
    rowKey: keyof T & string
    /** Légende du tableau (lue par les lecteurs d'écran ; visible si `showCaption`). */
    caption: string
    showCaption?: boolean
    sortKey?: string
    sortDirection?: SortDirection
  }>(),
  { sortKey: undefined, sortDirection: 'ascending' },
)

const emit = defineEmits<{ sort: [key: string, direction: SortDirection] }>()

function cellValue(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function ariaSort(column: DataTableColumn) {
  if (!column.sortable) return undefined
  return props.sortKey === column.key ? props.sortDirection : 'none'
}

function toggleSort(column: DataTableColumn) {
  const direction: SortDirection =
    props.sortKey === column.key && props.sortDirection === 'ascending' ? 'descending' : 'ascending'
  emit('sort', column.key, direction)
}
</script>

<template>
  <!-- Filet de sécurité : si les colonnes ne tiennent pas (tablette), la zone défile
       horizontalement ; elle est focusable pour défiler au clavier. -->
  <div class="data-table" role="region" :aria-label="caption" tabindex="0">
    <!-- Rôles ARIA explicites : le passage en display:block (mobile) fait perdre
         la sémantique de tableau à certains navigateurs ; on la rétablit. -->
    <table class="data-table__table" role="table">
      <caption :class="showCaption ? 'data-table__caption' : 'sr-only'">
        {{
          caption
        }}
      </caption>
      <thead role="rowgroup">
        <tr role="row">
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            role="columnheader"
            :aria-sort="ariaSort(column)"
            :style="column.width ? { width: column.width } : undefined"
            :class="{ 'is-numeric': column.numeric, 'hide-on-mobile': column.hideOnMobile }"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="data-table__sort"
              @click="toggleSort(column)"
            >
              {{ column.label }}
              <span class="data-table__sort-icon" aria-hidden="true">
                {{ sortKey === column.key ? (sortDirection === 'ascending' ? '▲' : '▼') : '↕' }}
              </span>
            </button>
            <template v-else>{{ column.label }}</template>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        <tr v-for="row in rows" :key="String(row[rowKey])" role="row">
          <td
            v-for="column in columns"
            :key="column.key"
            role="cell"
            :data-label="column.label"
            :class="{ 'is-numeric': column.numeric, 'hide-on-mobile': column.hideOnMobile }"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column.key)">
              {{ cellValue(row, column.key) ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="rows.length === 0" class="data-table__empty">
      <slot name="empty">Aucune donnée à afficher.</slot>
    </div>
  </div>
</template>

<style scoped>
.data-table {
  width: 100%;
  overflow-x: auto;
  container-type: inline-size;
}

.data-table:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

.data-table__table {
  width: 100%;
  font-size: var(--font-size-sm);
}

.data-table__caption {
  padding: 0 var(--space-4) var(--space-3);
  text-align: left;
  font-weight: var(--font-weight-semibold);
}

th {
  padding: var(--space-3);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
}

tbody tr:hover {
  background: var(--color-surface-hover);
}

.is-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
}

.data-table__sort:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.data-table__sort-icon {
  font-size: 0.8em;
}

/* Marge des bords : alignée sur le padding de la carte parente (variable héritée) */
th:first-child,
td:first-child {
  padding-left: var(--data-table-edge, var(--space-4));
}

th:last-child,
td:last-child {
  padding-right: var(--data-table-edge, var(--space-4));
}

.data-table__empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
}

/* ---- Largeur intermédiaire : on retire les colonnes secondaires --------- */
@container (max-width: 56rem) {
  .hide-on-mobile {
    display: none;
  }
}

/* ---- Largeur réduite : une fiche par ligne ------------------------------ */
@container (max-width: 40rem) {
  .data-table__table,
  .data-table__table tbody,
  .data-table__table tr,
  .data-table__table td {
    display: block;
    width: 100%;
  }

  /* En-têtes masqués visuellement mais conservés pour l'accessibilité */
  .data-table__table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .data-table__table tr {
    padding: var(--space-3) var(--data-table-edge, var(--space-4));
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .data-table__table td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
    padding: var(--space-1) 0;
    border: 0;
    text-align: right;
  }

  .data-table__table td::before {
    content: attr(data-label);
    flex-shrink: 0;
    max-width: 45%;
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-align: left;
  }

  /* La première colonne sert de titre de fiche */
  .data-table__table td:first-child {
    justify-content: flex-start;
    text-align: left;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);
  }

  .data-table__table td:first-child::before {
    display: none;
  }

  .data-table__table td.hide-on-mobile {
    display: none;
  }

  .data-table__table td:last-child {
    padding-right: 0;
  }
}
</style>
