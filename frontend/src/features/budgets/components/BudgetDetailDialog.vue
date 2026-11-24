<script setup lang="ts">
/**
 * Détail d'un budget : jauge + liste des dépenses imputées qui le consomment
 * (lignes fournies par le service, issues du calcul unique `computeImputedLines`).
 */
import { computed, watch } from 'vue'
import { BaseDialog, DataTable, EmptyState, ProgressBar, StatusBadge } from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents } from '@/core/money'
import { useServices } from '@/services'
import AsyncBlock from '@/features/dashboard/components/AsyncBlock.vue'
import type { ReferenceLabels } from '@/features/dashboard/composables/useReferenceLabels'
import { BUDGET_LEVEL_BADGE, budgetLevel, consumedText, remainingText } from '../budgetLevel'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ budgetId: string | null; labels: ReferenceLabels }>()

const detail = useAsync(() => useServices().budgets.getBudgetDetail(props.budgetId as string), {
  immediate: false,
})
watch(
  () => [open.value, props.budgetId],
  () => {
    if (open.value && props.budgetId) void detail.run()
  },
  { immediate: true },
)

// Une transaction peut avoir deux parts dans le même budget : clé de ligne unique.
const rows = computed(() =>
  (detail.data.value?.lines ?? []).map((l, i) => ({ ...l, rowId: `${l.transactionId}-${i}` })),
)

const columns = [
  { key: 'bookingDate', label: 'Date' },
  { key: 'label', label: 'Transaction' },
  { key: 'payingEntityId', label: 'Payé par', hideOnMobile: true },
  { key: 'costCenterId', label: 'Centre de coûts', hideOnMobile: true },
  { key: 'amountCents', label: 'Montant imputé', numeric: true },
]
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="detail.data.value?.status.budget.label ?? 'Détail du budget'"
    description="Dépenses imputées qui consomment ce budget."
    size="lg"
  >
    <AsyncBlock
      :loading="detail.loading.value"
      :error="detail.error.value"
      :ready="!!detail.data.value"
      skeleton="table"
      error-title="Impossible de charger le détail du budget"
      @retry="detail.run"
    >
      <div v-if="detail.data.value" class="detail" data-testid="budget-detail">
        <dl class="detail__meta">
          <div>
            <dt>Entité</dt>
            <dd>{{ labels.entity(detail.data.value.status.budget.entityId) }}</dd>
          </div>
          <div>
            <dt>Catégorie</dt>
            <dd>
              {{
                detail.data.value.status.budget.categoryId
                  ? labels.category(detail.data.value.status.budget.categoryId)
                  : 'Toutes'
              }}
            </dd>
          </div>
          <div>
            <dt>Centre de coûts</dt>
            <dd>
              {{
                detail.data.value.status.budget.costCenterId
                  ? labels.costCenter(detail.data.value.status.budget.costCenterId)
                  : 'Tous'
              }}
            </dd>
          </div>
        </dl>
        <ProgressBar
          label="Consommation"
          :value="detail.data.value.status.consumedCents"
          :max="detail.data.value.status.budget.amountCents"
          :value-text="consumedText(detail.data.value.status)"
        />
        <p class="detail__summary">
          <StatusBadge
            size="sm"
            :status="BUDGET_LEVEL_BADGE[budgetLevel(detail.data.value.status)].status"
            :label="BUDGET_LEVEL_BADGE[budgetLevel(detail.data.value.status)].label"
          />
          {{ formatBasisPoints(detail.data.value.status.consumedBp) }} consommés ·
          {{ remainingText(detail.data.value.status) }}
        </p>
        <DataTable
          :columns="columns"
          :rows="rows"
          row-key="rowId"
          caption="Dépenses imputées au budget"
        >
          <template #cell-bookingDate="{ row }">{{ formatIsoDate(row.bookingDate) }}</template>
          <template #cell-label="{ row }">
            {{ row.counterpartyName || row.label }}
            <span v-if="!row.implicit" class="detail__hint">(part imputée)</span>
          </template>
          <template #cell-payingEntityId="{ row }">{{
            labels.entity(row.payingEntityId)
          }}</template>
          <template #cell-costCenterId="{ row }">{{
            labels.costCenter(row.costCenterId)
          }}</template>
          <template #cell-amountCents="{ row }">{{ formatCents(row.amountCents) }}</template>
          <template #empty>
            <EmptyState compact title="Aucune dépense imputée à ce budget ce mois-ci" />
          </template>
        </DataTable>
        <p class="detail__total">
          Total consommé :
          <strong>{{ formatCents(detail.data.value.status.consumedCents) }}</strong>
          (somme des lignes ci-dessus)
        </p>
      </div>
    </AsyncBlock>
  </BaseDialog>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.detail__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-3);
  margin: 0;
  font-size: var(--font-size-sm);
}
.detail__meta dt {
  color: var(--color-text-secondary);
}
.detail__meta dd {
  margin: 0;
  font-weight: var(--font-weight-medium);
}
.detail__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.detail__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.detail__total {
  font-size: var(--font-size-sm);
}
</style>
