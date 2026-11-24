<script setup lang="ts">
/**
 * Abonnements fournisseurs récurrents et échéances à venir (renouvellements + factures à
 * payer), relatives à la date de démo figée. Signale les abonnements que l'IA juge
 * potentiellement redondants (suggestion, jamais appliquée automatiquement).
 * Filtres dans l'URL : `?onglet=abonnements|echeances&entityId=&statut=actif|resilie|tous&horizon=30|60|90`.
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseSelect,
  BaseTabs,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { DEMO_TODAY } from '@/config/demo'
import { addDays, formatIsoDate } from '@/core/dates/dates'
import { formatCents, sumCents } from '@/core/money'
import type { AiInsight, RecurringSubscription } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncBlock from '@/features/dashboard/components/AsyncBlock.vue'
import { useReferenceLabels } from '@/features/dashboard/composables/useReferenceLabels'
import { FREQUENCY_LABELS, annualCostCents, dueBadge, groupDueItems } from '../subscriptionModel'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const services = useServices()
const labels = useReferenceLabels()
void labels.load()

const q = (key: string) =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : ''
const tab = computed({
  get: () => (q('onglet') === 'echeances' ? 'echeances' : 'abonnements'),
  set: (value: string) => setFilter('onglet', value === 'echeances' ? 'echeances' : ''),
})
const entityId = computed(() => q('entityId') || scope.selectedEntityId || '')
const status = computed(() => q('statut') || 'actif')
const horizon = computed(() => (['60', '90'].includes(q('horizon')) ? Number(q('horizon')) : 30))

function setFilter(key: string, value: string): void {
  void router.replace({ query: { ...route.query, [key]: value || undefined } })
}

const scopeQuery = () => (entityId.value ? { entityId: entityId.value } : {})
const subscriptions = useAsync(() => services.subscriptions.listSubscriptions(scopeQuery()), {
  immediate: false,
})
const dues = useAsync(
  () =>
    services.subscriptions.listDueItems({
      ...scopeQuery(),
      range: { start: DEMO_TODAY, end: addDays(DEMO_TODAY, horizon.value) },
    }),
  { immediate: false },
)
const insights = useAsync(
  () => services.aiInsights.listInsights({ type: 'redundant_subscription', status: 'open' }),
  { immediate: false },
)
watch(entityId, () => void subscriptions.run(), { immediate: true })
watch([entityId, horizon], () => void dues.run(), { immediate: true })
if (auth.can('ai-insights:read')) void insights.run()

const visibleSubscriptions = computed(() =>
  (subscriptions.data.value ?? []).filter(
    (s) =>
      status.value === 'tous' ||
      (status.value === 'actif' ? s.status === 'active' : s.status === 'cancelled'),
  ),
)
const activeAnnualTotal = computed(() =>
  sumCents(
    (subscriptions.data.value ?? []).filter((s) => s.status === 'active').map(annualCostCents),
  ),
)
/** Suggestion IA « abonnement redondant » qui concerne cet abonnement, s'il y en a une. */
function redundancy(sub: RecurringSubscription): AiInsight | undefined {
  return insights.data.value?.find((i) => i.relatedSubscriptionIds.includes(sub.id))
}
const groups = computed(() => groupDueItems(dues.data.value ?? []))

const tabs = computed(() => [
  { id: 'abonnements', label: 'Abonnements', count: visibleSubscriptions.value.length },
  { id: 'echeances', label: 'Échéances', count: dues.data.value?.length },
])
const entityOptions = computed(() => [
  { value: '', label: 'Toutes les entités' },
  ...labels.entities.value.map((e) => ({ value: e.id, label: e.name })),
])
const statusOptions = [
  { value: 'actif', label: 'Actifs' },
  { value: 'resilie', label: 'Résiliés' },
  { value: 'tous', label: 'Tous' },
]
const horizonOptions = [
  { value: '30', label: '30 prochains jours' },
  { value: '60', label: '60 prochains jours' },
  { value: '90', label: '90 prochains jours' },
]
const columns = [
  { key: 'name', label: 'Abonnement' },
  { key: 'entityId', label: 'Entité', hideOnMobile: true },
  { key: 'amountCents', label: 'Montant', numeric: true },
  { key: 'nextRenewalDate', label: 'Prochain renouvellement' },
  { key: 'annual', label: 'Coût annualisé', numeric: true },
  { key: 'status', label: 'Statut' },
]
</script>

<template>
  <div class="page">
    <PageHeader
      title="Abonnements et échéances"
      :description="`Abonnements fournisseurs récurrents et dates à venir, au ${formatIsoDate(DEMO_TODAY)} (date de démonstration figée).`"
    />

    <div class="filters">
      <BaseSelect
        label="Entité"
        :model-value="entityId"
        :options="entityOptions"
        @update:model-value="setFilter('entityId', $event)"
      />
      <BaseSelect
        v-if="tab === 'abonnements'"
        label="Statut"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="setFilter('statut', $event === 'actif' ? '' : $event)"
      />
      <BaseSelect
        v-else
        label="Horizon"
        :model-value="String(horizon)"
        :options="horizonOptions"
        @update:model-value="setFilter('horizon', $event === '30' ? '' : $event)"
      />
    </div>

    <BaseTabs v-model="tab" label="Abonnements et échéances" :tabs="tabs">
      <template #panel-abonnements>
        <AsyncBlock
          :loading="subscriptions.loading.value"
          :error="subscriptions.error.value"
          :ready="!!subscriptions.data.value"
          skeleton="table"
          error-title="Impossible de charger les abonnements"
          @retry="subscriptions.run"
        >
          <p class="summary" data-testid="subscriptions-annual">
            Coût annualisé des abonnements actifs :
            <strong>{{ formatCents(activeAnnualTotal) }}</strong>
          </p>
          <DataTable
            :columns="columns"
            :rows="visibleSubscriptions"
            row-key="id"
            caption="Abonnements fournisseurs"
            data-testid="subscriptions-table"
          >
            <template #cell-name="{ row }">
              <span class="sub-name">{{ row.name }}</span>
              <span class="sub-supplier">{{ labels.supplier(row.supplierId) }}</span>
              <span v-if="redundancy(row)" class="sub-ai">
                <AiProvenanceBadge
                  provenance="suggested"
                  size="sm"
                  detail="Abonnement redondant ?"
                />
                <RouterLink
                  :to="{ name: RouteName.AiInsights, hash: `#${redundancy(row)!.id}` }"
                  data-testid="redundant-link"
                >
                  Voir l’analyse
                </RouterLink>
              </span>
            </template>
            <template #cell-entityId="{ row }">{{ labels.entity(row.entityId) }}</template>
            <template #cell-amountCents="{ row }">
              {{ formatCents(row.amountCents) }}
              <span class="sub-supplier">{{ FREQUENCY_LABELS[row.frequency] }}</span>
            </template>
            <template #cell-nextRenewalDate="{ row }">
              {{ row.status === 'active' ? formatIsoDate(row.nextRenewalDate) : '—' }}
            </template>
            <template #cell-annual="{ row }">
              {{ row.status === 'active' ? formatCents(annualCostCents(row)) : '—' }}
            </template>
            <template #cell-status="{ row }">
              <StatusBadge
                size="sm"
                :status="row.status === 'active' ? 'active' : 'inactive'"
                :label="row.status === 'active' ? 'Actif' : 'Résilié'"
              />
            </template>
            <template #empty>
              <EmptyState compact icon="repeat" title="Aucun abonnement pour ces filtres" />
            </template>
          </DataTable>
        </AsyncBlock>
      </template>

      <template #panel-echeances>
        <AsyncBlock
          :loading="dues.loading.value"
          :error="dues.error.value"
          :ready="!!dues.data.value"
          skeleton="table"
          error-title="Impossible de charger les échéances"
          @retry="dues.run"
        >
          <EmptyState
            v-if="groups.length === 0"
            icon="calendar"
            title="Aucune échéance sur cette période"
            description="Aucun renouvellement ni facture à payer dans l’horizon choisi."
          />
          <div v-else class="dues" data-testid="due-list">
            <p class="summary">
              {{ dues.data.value?.length }} échéance(s) ·
              {{ formatCents(sumCents((dues.data.value ?? []).map((d) => d.amountCents))) }} au
              total (factures en retard incluses).
            </p>
            <section
              v-for="g in groups"
              :key="g.id"
              :aria-labelledby="`due-${g.id}`"
              class="due-group"
            >
              <h2 :id="`due-${g.id}`" class="due-group__title">
                {{ g.title }} <span class="count">({{ g.items.length }})</span>
              </h2>
              <ul class="due-list">
                <li
                  v-for="d in g.items"
                  :key="d.kind + d.sourceId + d.dueDate"
                  class="due"
                  :class="`due--${g.id}`"
                  data-testid="due-item"
                >
                  <div class="due__date">
                    <span class="due__day">{{ formatIsoDate(d.dueDate) }}</span>
                    <StatusBadge size="sm" v-bind="dueBadge(d)" />
                  </div>
                  <div class="due__main">
                    <p class="due__label">
                      <RouterLink
                        v-if="d.kind === 'invoice_due' && auth.can('invoices:read')"
                        :to="{ name: RouteName.InvoiceDetail, params: { invoiceId: d.sourceId } }"
                      >
                        {{ d.label }}
                      </RouterLink>
                      <template v-else>{{ d.label }}</template>
                    </p>
                    <p class="due__meta">
                      {{
                        d.kind === 'invoice_due' ? 'Facture à payer' : 'Renouvellement d’abonnement'
                      }}
                      · {{ labels.entity(d.entityId) }}
                    </p>
                  </div>
                  <span class="due__amount tabular-nums">{{ formatCents(d.amountCents) }}</span>
                </li>
              </ul>
            </section>
          </div>
        </AsyncBlock>
      </template>
    </BaseTabs>
  </div>
</template>

<style scoped>
.page {
  min-width: 0;
}
.filters {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
  margin-bottom: var(--space-5);
}
@media (min-width: 640px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 16rem));
  }
}
.summary {
  margin: var(--space-4) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.sub-name {
  display: block;
  font-weight: var(--font-weight-medium);
}
.sub-supplier {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.sub-ai {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
}
.dues {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.due-group__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}
.count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.due-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.due {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2) var(--space-4);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.due--overdue {
  border-left: 4px solid var(--color-danger-solid);
}
.due--soon {
  border-left: 4px solid var(--color-warning-solid);
}
.due__date {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.due__day {
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
@media (min-width: 640px) {
  .due {
    grid-template-columns: 11rem 1fr auto;
  }
  .due__date {
    grid-column: auto;
    flex-direction: column;
    align-items: flex-start;
  }
}
.due__label {
  font-weight: var(--font-weight-medium);
}
.due__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.due__amount {
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
</style>
