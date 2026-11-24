<script setup lang="ts">
import ErrorMessage from '@/components/ErrorMessage.vue'
import { useAsync } from '@/composables/useAsync'
import { formatCents } from '@/core/money'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'

/**
 * Tableau de bord consolidé — VERSION PROVISOIRE qui prouve la chaîne complète
 * (service → calcul unique → affichage, erreurs). L'agent dashboards la remplacera.
 */
const services = useServices()
const org = useAsync(() => services.organization.getCurrentOrganization())
const entities = useAsync(() => services.organization.listEntities())
const summary = useAsync(() => services.dashboard.getSummary())

function reload() {
  void org.run()
  void entities.run()
  void summary.run()
}
</script>

<template>
  <section>
    <h1>
      Tableau de bord
      <span v-if="org.data.value" data-testid="org-name">— {{ org.data.value.name }}</span>
    </h1>
    <p v-if="summary.loading.value">Chargement…</p>
    <ErrorMessage :error="summary.error.value ?? org.error.value" @retry="reload" />
    <dl v-if="summary.data.value" class="kpis" data-testid="dashboard-summary">
      <div>
        <dt>Dépenses (imputées)</dt>
        <dd class="amount" data-testid="spend-total">
          {{ formatCents(summary.data.value.spend.imputedTotalCents) }}
        </dd>
      </div>
      <div>
        <dt>Factures à payer (hors dépenses)</dt>
        <dd class="amount">{{ formatCents(summary.data.value.toPayCents) }}</dd>
      </div>
      <div>
        <dt>Justificatifs manquants</dt>
        <dd>{{ summary.data.value.missingReceiptCount }}</dd>
      </div>
      <div>
        <dt>Rapprochements en attente</dt>
        <dd>{{ summary.data.value.pendingReconciliationCount }}</dd>
      </div>
    </dl>
    <ul v-if="entities.data.value">
      <li v-for="e in entities.data.value" :key="e.id">
        <RouterLink :to="{ name: RouteName.EntityDashboard, params: { entityId: e.id } }">
          {{ e.name }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--space-4);
}
.kpis div {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
dd {
  margin: 0;
  font-size: var(--font-size-lg);
}
</style>
