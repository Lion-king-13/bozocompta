<script setup lang="ts">
/**
 * Bandeau « Mode démonstration », toujours visible en mode mock (exigence d'honnêteté :
 * données fictives, connexion simulée). Non masquable.
 * `withPanel` : ajoute le bouton « Simuler une erreur » et le panneau (application connectée).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DemoModePanel from '@/components/DemoModePanel.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { ERROR_SCENARIOS } from '@/core/errors'
import { useDemoModeStore } from '@/stores/demoMode'

defineProps<{ withPanel?: boolean }>()

const demo = useDemoModeStore()
const root = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)

const activeLabel = computed(() =>
  demo.simulation ? ERROR_SCENARIOS[demo.simulation.scenario].label.replace(/^\d\.\s*/, '') : null,
)

function closePanel(returnFocus = true) {
  demo.panelOpen = false
  if (returnFocus) toggle.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && demo.panelOpen) closePanel()
}

function onDocumentClick(event: MouseEvent) {
  if (demo.panelOpen && root.value && !root.value.contains(event.target as Node)) closePanel(false)
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div v-if="demo.available" ref="root" class="demo-banner" @keydown="onKeydown">
    <div class="demo-banner__bar">
      <p class="demo-banner__text">
        <BaseIcon name="info" :size="16" />
        <span
          ><strong>Mode démonstration</strong> — données fictives, connexion simulée, aucune donnée
          réelle n’est envoyée.</span
        >
      </p>

      <p v-if="activeLabel" class="demo-banner__active" role="status" data-testid="demo-active">
        <BaseIcon name="alert-triangle" :size="14" />
        Erreur simulée active : {{ activeLabel }}
        <button type="button" class="demo-banner__link" @click="demo.clear()">Désactiver</button>
      </p>

      <button
        v-if="withPanel"
        ref="toggle"
        type="button"
        class="demo-banner__toggle"
        :aria-expanded="demo.panelOpen"
        aria-controls="demo-panel"
        data-testid="demo-toggle"
        @click="demo.panelOpen = !demo.panelOpen"
      >
        <BaseIcon name="bolt" :size="14" />
        Simuler une erreur
      </button>
    </div>

    <div v-if="withPanel && demo.panelOpen" id="demo-panel" class="demo-banner__panel">
      <DemoModePanel @close="closePanel()" />
    </div>
  </div>
</template>

<style scoped>
.demo-banner {
  position: relative;
  z-index: var(--z-dropdown);
  background: var(--color-demo-bg);
  border-bottom: 1px solid var(--color-demo-border);
  color: var(--color-demo-text);
  font-size: var(--font-size-sm);
}

.demo-banner__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-1) var(--space-4);
  padding: var(--space-2) var(--page-gutter);
}

.demo-banner__text,
.demo-banner__active {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.demo-banner__text svg {
  align-self: flex-start;
  margin-top: 3px;
}

.demo-banner__active {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
  font-weight: var(--font-weight-semibold);
}

.demo-banner__link {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
}

.demo-banner__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-demo-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-demo-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.demo-banner__toggle:hover {
  border-color: var(--color-demo-text);
}

.demo-banner__toggle:focus-visible,
.demo-banner__link:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.demo-banner__panel {
  position: absolute;
  top: 100%;
  left: var(--space-2);
  right: var(--space-2);
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
}

@media (min-width: 768px) {
  .demo-banner__panel {
    left: auto;
    right: var(--page-gutter);
    width: 40rem;
  }
}
</style>
