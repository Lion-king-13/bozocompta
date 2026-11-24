<script setup lang="ts">
/**
 * Alternative textuelle d'un graphique : tableau de données équivalent, replié
 * derrière « Voir les données » (toujours présent dans le DOM, donc lisible par un
 * lecteur d'écran et par les tests).
 */
defineProps<{
  caption: string
  columns: string[]
  /** Cellules déjà formatées ; la première colonne est l'en-tête de ligne. */
  rows: string[][]
}>()
</script>

<template>
  <details class="chart-table" data-testid="chart-data-table">
    <summary>Voir les données</summary>
    <div class="chart-table__scroll">
      <table>
        <caption>
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th v-for="(c, i) in columns" :key="c" scope="col" :class="{ num: i > 0 }">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in rows" :key="r">
            <template v-for="(cell, i) in row" :key="i">
              <th v-if="i === 0" scope="row">{{ cell }}</th>
              <td v-else class="num">{{ cell }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</template>

<style scoped>
.chart-table {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
}
summary {
  cursor: pointer;
  color: var(--color-text-link);
  width: fit-content;
  min-height: 1.5rem;
}
.chart-table__scroll {
  overflow-x: auto;
  margin-top: var(--space-2);
}
table {
  width: 100%;
  border-collapse: collapse;
}
caption {
  text-align: left;
  font-weight: var(--font-weight-semibold);
  padding-bottom: var(--space-2);
}
th,
td {
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
  text-align: left;
  font-weight: var(--font-weight-regular);
}
thead th {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
