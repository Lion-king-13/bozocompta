<script setup lang="ts">
/**
 * Onglets accessibles (motif ARIA « tabs »).
 * Clavier : ← → pour changer d'onglet, Début / Fin pour le premier / dernier.
 * Le contenu de chaque onglet se place dans un slot nommé `panel-<id>`.
 *
 *   <BaseTabs v-model="tab" label="Détail de la facture"
 *     :tabs="[{ id: 'lines', label: 'Lignes', count: 3 }, { id: 'allocations', label: 'Imputations' }]">
 *     <template #panel-lines>…</template>
 *     <template #panel-allocations>…</template>
 *   </BaseTabs>
 */
import { nextTick, useId } from 'vue'
import type { TabItem } from './types'

const active = defineModel<string>({ required: true })

const props = defineProps<{
  tabs: TabItem[]
  /** Nom de l'ensemble d'onglets pour les lecteurs d'écran. */
  label: string
}>()

const baseId = useId()

const tabId = (id: string) => `${baseId}-tab-${id}`
const panelId = (id: string) => `${baseId}-panel-${id}`

async function select(index: number) {
  const tab = props.tabs[index]
  if (!tab || tab.disabled) return
  active.value = tab.id
  await nextTick()
  document.getElementById(tabId(tab.id))?.focus()
}

function onKeydown(event: KeyboardEvent, index: number) {
  const enabled = props.tabs.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0)
  const position = enabled.indexOf(index)
  let next: number | undefined
  if (event.key === 'ArrowRight') next = enabled[(position + 1) % enabled.length]
  else if (event.key === 'ArrowLeft')
    next = enabled[(position - 1 + enabled.length) % enabled.length]
  else if (event.key === 'Home') next = enabled[0]
  else if (event.key === 'End') next = enabled[enabled.length - 1]
  if (next === undefined) return
  event.preventDefault()
  select(next)
}
</script>

<template>
  <div class="tabs">
    <div class="tabs__list" role="tablist" :aria-label="label">
      <button
        v-for="(tab, index) in tabs"
        :id="tabId(tab.id)"
        :key="tab.id"
        type="button"
        role="tab"
        class="tabs__tab"
        :aria-selected="tab.id === active"
        :aria-controls="panelId(tab.id)"
        :tabindex="tab.id === active ? 0 : -1"
        :disabled="tab.disabled"
        @click="select(index)"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tabs__count">{{ tab.count }}</span>
      </button>
    </div>

    <div
      v-for="tab in tabs"
      v-show="tab.id === active"
      :id="panelId(tab.id)"
      :key="tab.id"
      class="tabs__panel"
      role="tabpanel"
      :aria-labelledby="tabId(tab.id)"
      tabindex="0"
    >
      <slot :name="`panel-${tab.id}`" />
    </div>
  </div>
</template>

<style scoped>
.tabs__list {
  display: flex;
  gap: var(--space-1);
  /* Écran étroit : les onglets passent à la ligne plutôt que d'être coupés (QA-27).
     Tous restent visibles ; l'ordre et la navigation au clavier ne changent pas. */
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
}

.tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  min-height: var(--touch-target);
  padding: 0 var(--space-3);
  margin-bottom: -1px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.tabs__tab:hover:not(:disabled) {
  color: var(--color-text);
}

.tabs__tab[aria-selected='true'] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.tabs__tab:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.tabs__tab:disabled {
  color: var(--color-text-disabled);
}

.tabs__count {
  min-width: 1.5rem;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.tabs__panel {
  padding-top: var(--space-4);
}

.tabs__panel:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}
</style>
