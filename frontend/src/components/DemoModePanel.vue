<script setup lang="ts">
/**
 * Panneau « Mode démonstration » : déclenche en UN clic les quatre erreurs simulables
 * (proposition technique du groupe, cahier des charges §8), plus des scénarios complémentaires.
 * Mode mock uniquement. Les mêmes scénarios sont accessibles par l'URL `?demoError=`.
 */
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { useToasts } from '@/composables/useToasts'
import { ERROR_SCENARIOS, ERROR_SCENARIO_IDS, type ErrorScenarioId } from '@/core/errors'
import { useDemoModeStore } from '@/stores/demoMode'

defineEmits<{ close: [] }>()

const demo = useDemoModeStore()
const toast = useToasts()

/** Libellés de l'interface pour les quatre erreurs mises en avant. */
const FEATURED: { id: ErrorScenarioId; title: string; effect: string; icon: IconName }[] = [
  {
    id: 'invalidFile',
    title: 'Fichier invalide',
    effect: 'Les imports PDF et CSV suivants sont refusés.',
    icon: 'file',
  },
  {
    id: 'aiUnavailable',
    title: 'Service IA indisponible',
    effect: 'Extraction, suggestions et analyses IA échouent ; la consultation fonctionne.',
    icon: 'sparkle',
  },
  {
    id: 'aiQuotaExceeded',
    title: 'Quota IA dépassé',
    effect: 'Les fonctions IA sont bloquées comme si le quota du mois était atteint.',
    icon: 'bolt',
  },
  {
    id: 'network',
    title: 'API indisponible',
    effect: 'Toutes les requêtes échouent comme si le serveur était injoignable.',
    icon: 'wifi-off',
  },
]

const others = ERROR_SCENARIO_IDS.filter((id) => !ERROR_SCENARIOS[id].featured)
const otherScenario = ref<ErrorScenarioId>(others[0] ?? 'server')
const once = ref(false)

const activeId = computed(() => demo.simulation?.scenario ?? null)

function activate(id: ErrorScenarioId) {
  demo.activate(id, { mode: once.value ? 'once' : 'always' })
  const title = FEATURED.find((f) => f.id === id)?.title ?? ERROR_SCENARIOS[id].label
  toast.info(
    `Erreur simulée activée : ${title}.${once.value ? ' Elle se produira une seule fois.' : ''}`,
  )
}

function clear() {
  demo.clear()
  toast.success('Simulation d’erreur désactivée.')
}
</script>

<template>
  <section class="demo-panel" data-testid="demo-mode" aria-labelledby="demo-panel-title">
    <header class="demo-panel__header">
      <div>
        <h2 id="demo-panel-title" class="demo-panel__title">Simuler une erreur</h2>
        <p class="demo-panel__intro">
          Pour la démonstration : l’erreur choisie est renvoyée par les services simulés jusqu’à sa
          désactivation. L’opération visée échoue sans rien modifier.
        </p>
      </div>
      <button
        type="button"
        class="demo-panel__close"
        aria-label="Fermer le panneau"
        @click="$emit('close')"
      >
        <BaseIcon name="x" :size="18" />
      </button>
    </header>

    <ul class="demo-panel__grid">
      <li v-for="item in FEATURED" :key="item.id">
        <button
          type="button"
          class="demo-panel__scenario"
          :class="{ 'is-active': activeId === item.id }"
          :aria-pressed="activeId === item.id"
          :data-testid="`demo-scenario-${item.id}`"
          @click="activate(item.id)"
        >
          <span class="demo-panel__icon"><BaseIcon :name="item.icon" :size="18" /></span>
          <span class="demo-panel__text">
            <span class="demo-panel__name">{{ item.title }}</span>
            <span class="demo-panel__effect">{{ item.effect }}</span>
          </span>
          <span v-if="activeId === item.id" class="demo-panel__on">Active</span>
        </button>
      </li>
    </ul>

    <details class="demo-panel__more">
      <summary>Autres scénarios et options</summary>
      <div class="demo-panel__more-body">
        <label class="demo-panel__field">
          <span>Scénario complémentaire</span>
          <select v-model="otherScenario" data-testid="demo-scenario">
            <option v-for="id in others" :key="id" :value="id">
              {{ ERROR_SCENARIOS[id].label }}
            </option>
          </select>
        </label>
        <BaseButton size="sm" variant="secondary" @click="activate(otherScenario)"
          >Activer</BaseButton
        >
        <label class="demo-panel__check">
          <input v-model="once" type="checkbox" />
          Ne déclencher l’erreur qu’une seule fois
        </label>
      </div>
    </details>

    <footer class="demo-panel__footer">
      <BaseButton
        size="sm"
        variant="secondary"
        icon="refresh"
        :disabled="!demo.simulation"
        data-testid="demo-clear"
        @click="clear"
      >
        Désactiver la simulation
      </BaseButton>
    </footer>
  </section>
</template>

<style scoped>
.demo-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-demo-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
  text-align: left;
}

.demo-panel__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.demo-panel__title {
  font-size: var(--font-size-lg);
}

.demo-panel__intro {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.demo-panel__close {
  display: inline-flex;
  align-self: flex-start;
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text-secondary);
}

.demo-panel__close:focus-visible {
  outline: var(--focus-outline);
}

.demo-panel__grid {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .demo-panel__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.demo-panel__scenario {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  height: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  text-align: left;
}

.demo-panel__scenario:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.demo-panel__scenario:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.demo-panel__scenario.is-active {
  border-color: var(--color-danger-solid);
  background: var(--color-danger-bg);
}

.demo-panel__icon {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
}

.is-active .demo-panel__icon {
  background: var(--color-surface);
  color: var(--color-danger-text);
}

.demo-panel__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.demo-panel__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.demo-panel__effect {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: var(--line-height-snug);
}

.demo-panel__on {
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--color-danger-solid);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.demo-panel__more summary {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-link);
  cursor: pointer;
}

.demo-panel__more-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.demo-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
}

.demo-panel__field select {
  min-height: var(--control-height-sm);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.demo-panel__check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.demo-panel__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}
</style>
