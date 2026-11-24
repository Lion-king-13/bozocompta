<script setup lang="ts">
/**
 * Dépenses ventilées : les transactions qui ont une répartition analytique explicite,
 * avec « payé par » et « imputé à ». Les autres dépenses sont imputées à 100 % à leur
 * entité payeuse (règle par défaut) et peuvent être réparties depuis cette page.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  BaseButton,
  BaseCard,
  BaseSelect,
  DataTable,
  EmptyState,
  PageHeader,
  type DataTableColumn,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { Allocation, BankTransactionView } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import FilterBar from '@/features/transactions/shared/FilterBar.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const router = useRouter()
const refData = useReferenceData()
void refData.load()

const entityFilter = ref('')
const costCenterFilter = ref('')
const toSplit = ref('')

/** Allocations imputées au périmètre + toutes les transactions de débit visibles. */
const data = useAsync(async () => {
  const entityId = entityFilter.value || scope.selectedEntityId || undefined
  const [allocations, transactions] = await Promise.all([
    services.allocations.listAllocations({ entityId }),
    services.transactions.listTransactions({ direction: 'debit', pageSize: 200 }),
  ])
  return { allocations, transactions: transactions.items }
})
watch([entityFilter, () => scope.selectedEntityId], () => void data.run())

interface Row {
  id: string
  tx: BankTransactionView
  allocations: Allocation[]
}

const rows = computed<Row[]>(() => {
  const current = data.data.value
  if (!current) return []
  const byTx = new Map<string, Allocation[]>()
  for (const a of current.allocations) {
    if (costCenterFilter.value && a.costCenterId !== costCenterFilter.value) continue
    byTx.set(a.transactionId, [...(byTx.get(a.transactionId) ?? []), a])
  }
  return current.transactions
    .filter((tx) => byTx.has(tx.id))
    .map((tx) => ({ id: tx.id, tx, allocations: byTx.get(tx.id) ?? [] }))
})

const splittable = computed(() =>
  (data.data.value?.transactions ?? []).map((tx) => ({
    value: tx.id,
    label: `${formatIsoDate(tx.bookingDate)} · ${tx.counterpartyName} · ${formatCents(tx.amountCents)}`,
  })),
)

const entityOptions = computed(() => [
  { value: '', label: scope.selectedEntityId ? 'Périmètre sélectionné' : 'Toutes les entités' },
  ...refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
])
const costCenterOptions = computed(() => [
  { value: '', label: 'Tous les centres de coûts' },
  ...refData.costCenters.value.map((c) => ({
    value: c.id,
    label: `${c.name} (${refData.entityName(c.entityId)})`,
  })),
])
const activeCount = computed(
  () => [entityFilter.value, costCenterFilter.value].filter(Boolean).length,
)
function clearFilters() {
  entityFilter.value = ''
  costCenterFilter.value = ''
}

const columns: DataTableColumn[] = [
  { key: 'label', label: 'Dépense' },
  { key: 'date', label: 'Date', hideOnMobile: true },
  { key: 'paidBy', label: 'Payé par' },
  { key: 'imputed', label: 'Imputé à' },
  { key: 'amount', label: 'Montant payé', numeric: true },
]

function openEditor(transactionId: string) {
  if (transactionId)
    void router.push({ name: RouteName.AllocationEditor, params: { transactionId } })
}

function retry() {
  void refData.load()
  void data.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Allocations analytiques"
      description="Une dépense peut être imputée à plusieurs entités ou centres de coûts. Elle reste UNE seule dépense : pas de dépense supplémentaire, pas d'écriture intersociétés."
    />

    <AsyncContent
      :loading="data.loading.value && !data.data.value"
      :error="data.error.value ?? refData.error.value"
      error-title="Impossible de charger les allocations"
      @retry="retry"
    >
      <BaseCard v-if="auth.can('allocations:write')" title="Répartir une dépense">
        <div class="split-form">
          <BaseSelect
            v-model="toSplit"
            label="Dépense (transaction de débit)"
            :options="splittable"
            placeholder="Choisir une dépense"
          />
          <BaseButton icon="split" :disabled="!toSplit" @click="openEditor(toSplit)"
            >Ouvrir l'éditeur de répartition</BaseButton
          >
        </div>
      </BaseCard>

      <FilterBar :active-count="activeCount" @clear="clearFilters">
        <BaseSelect v-model="entityFilter" label="Imputé à — entité" :options="entityOptions" />
        <BaseSelect
          v-model="costCenterFilter"
          label="Centre de coûts / projet"
          :options="costCenterOptions"
        />
      </FilterBar>

      <BaseCard flush>
        <DataTable :columns="columns" :rows="rows" row-key="id" caption="Dépenses ventilées">
          <template #cell-label="{ row }">
            <RouterLink
              :to="{ name: RouteName.AllocationEditor, params: { transactionId: row.tx.id } }"
              >{{ row.tx.counterpartyName }}</RouterLink
            >
          </template>
          <template #cell-date="{ row }">{{ formatIsoDate(row.tx.bookingDate) }}</template>
          <template #cell-paidBy="{ row }">
            {{ refData.entityName(row.tx.entityId) }}
            <span v-if="row.tx.cardId" class="text-secondary">
              · {{ refData.cardHolderName(row.tx.cardId) }}</span
            >
          </template>
          <template #cell-imputed="{ row }">
            <ul class="targets">
              <li v-for="a in row.allocations" :key="a.id">
                {{ refData.targetLabel(a.entityId, a.costCenterId) }} :
                <span class="tabular-nums"
                  >{{ formatBasisPoints(a.percentBp) }} = {{ formatCents(a.amountCents) }}</span
                >
              </li>
            </ul>
          </template>
          <template #cell-amount="{ row }">{{ formatCents(row.tx.amountCents) }}</template>
          <template #empty>
            <EmptyState
              compact
              icon="split"
              title="Aucune dépense répartie"
              description="Les dépenses sans répartition sont imputées à 100 % à l'entité qui les a payées."
            />
          </template>
        </DataTable>
      </BaseCard>
    </AsyncContent>
  </div>
</template>

<style scoped>
.split-form {
  display: grid;
  gap: var(--space-3);
  align-items: end;
}
@media (min-width: 768px) {
  .split-form {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
.targets {
  margin: 0;
  padding-left: var(--space-4);
}
</style>
