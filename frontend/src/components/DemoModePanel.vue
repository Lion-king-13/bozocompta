<script setup lang="ts">
import { computed, ref } from 'vue'
import { ERROR_SCENARIOS, ERROR_SCENARIO_IDS, type ErrorScenarioId } from '@/core/errors'
import { useDemoModeStore } from '@/stores/demoMode'

/**
 * Petit panneau « Mode démo » (mode mock uniquement) pour déclencher les erreurs simulées.
 * Mise en forme minimale : l'agent UI pourra l'habiller.
 */
const demo = useDemoModeStore()
const scenario = ref<ErrorScenarioId>('network')
const scope = ref('')
const once = ref(false)

const featured = ERROR_SCENARIO_IDS.filter((id) => ERROR_SCENARIOS[id].featured)
const others = ERROR_SCENARIO_IDS.filter((id) => !ERROR_SCENARIOS[id].featured)
const activeLabel = computed(() =>
  demo.simulation ? ERROR_SCENARIOS[demo.simulation.scenario].label : null,
)

function activate() {
  demo.activate(scenario.value, {
    scope: scope.value || undefined,
    mode: once.value ? 'once' : 'always',
  })
}
</script>

<template>
  <div v-if="demo.available" class="demo" data-testid="demo-mode">
    <button type="button" :aria-expanded="demo.panelOpen" @click="demo.panelOpen = !demo.panelOpen">
      Mode démo{{ activeLabel ? ` : ${activeLabel}` : '' }}
    </button>
    <form v-if="demo.panelOpen" class="panel" @submit.prevent="activate">
      <label>
        Erreur à simuler
        <select v-model="scenario" data-testid="demo-scenario">
          <optgroup label="Les quatre erreurs simulables">
            <option v-for="id in featured" :key="id" :value="id">
              {{ ERROR_SCENARIOS[id].label }}
            </option>
          </optgroup>
          <optgroup label="Autres">
            <option v-for="id in others" :key="id" :value="id">
              {{ ERROR_SCENARIOS[id].label }}
            </option>
          </optgroup>
        </select>
      </label>
      <label>
        Portée (vide = défaut « {{ ERROR_SCENARIOS[scenario].defaultScope }} »)
        <input v-model="scope" placeholder="ex. invoices, imports, ai, *" />
      </label>
      <label><input v-model="once" type="checkbox" /> Une seule fois</label>
      <div>
        <button type="submit">Activer</button>
        <button type="button" :disabled="!demo.simulation" @click="demo.clear()">Désactiver</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.demo {
  font-size: var(--font-size-sm);
}
.panel {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: var(--space-3);
  background: var(--color-warning-bg);
  border-radius: var(--radius-md);
}
</style>
