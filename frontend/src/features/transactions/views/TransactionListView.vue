<script setup lang="ts">
/**
 * Transactions bancaires = unités de dépense (débits). Filtres : entité, carte,
 * collaborateur, catégorie, période, sens, justificatif. Filtrage fait par le service.
 * Les filtres sont lus dans l'URL et y sont réécrits (QA-01). Filtrée sur une entité, la liste
 * contient les transactions payées par OU imputées à cette entité (D7) et affiche la part
 * imputée, dont la somme est celle du tableau de bord de l'entité (QA-05).
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  BaseButton,
  BaseCard,
  BasePagination,
  BaseSelect,
  BaseTextField,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents, sumCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { BankTransactionQuery, TransactionDirection } from '@/domain'
import { imputedPart } from '../shared/imputation'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '../shared/AsyncContent.vue'
import FilterBar from '../shared/FilterBar.vue'
import { transactionMatchStatus } from '../shared/labels'
import { useQueryFilters } from '../shared/useQueryFilters'
import { useReferenceData } from '../shared/useReferenceData'

const PAGE_SIZE = 10
const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const router = useRouter()
const refData = useReferenceData()
void refData.load()

/** Noms des paramètres d'URL = champs de `BankTransactionQuery` (QA-01). */
const EMPTY = {
  search: '',
  entityId: '',
  cardId: '',
  holderUserId: '',
  categoryId: '',
  direction: '',
  missingReceipt: '',
  bookedFrom: '',
  bookedTo: '',
}
const filters = useQueryFilters({ ...EMPTY })

/** Le filtre de la page (`?entityId=` à l'arrivée) prime ; sinon le périmètre de l'en-tête. */
const effectiveEntityId = computed(() => filters.entityId || scope.selectedEntityId || undefined)
const page = ref(1)

const baseQuery = computed<BankTransactionQuery>(() => ({
  search: filters.search.trim() || undefined,
  entityId: effectiveEntityId.value,
  cardId: filters.cardId || undefined,
  holderUserId: filters.holderUserId || undefined,
  categoryId: filters.categoryId || undefined,
  direction: (filters.direction as TransactionDirection) || undefined,
  missingReceipt: filters.missingReceipt === '' ? undefined : filters.missingReceipt === 'true',
  bookedFrom: filters.bookedFrom || undefined,
  bookedTo: filters.bookedTo || undefined,
}))

const list = useAsync(() =>
  services.transactions.listTransactions({
    ...baseQuery.value,
    page: page.value,
    pageSize: PAGE_SIZE,
  }),
)
/** Toutes les lignes filtrées (sans pagination) pour le total imputé à l'entité filtrée. */
const all = useAsync(() =>
  services.transactions.listTransactions({ ...baseQuery.value, pageSize: 200 }),
)
const imputedTotal = computed(() => {
  const entityId = effectiveEntityId.value
  if (!entityId || !all.data.value) return null
  return sumCents(
    all.data.value.items
      .filter((t) => t.direction === 'debit')
      .map((t) => imputedPart(t, entityId).amountCents),
  )
})
watch(
  () => ({ ...filters, scope: scope.selectedEntityId }),
  () => {
    page.value = 1
    void list.run()
    void all.run()
  },
)
watch(page, () => void list.run())

const activeCount = computed(() => Object.values(filters).filter(Boolean).length)
function clearFilters() {
  Object.assign(filters, EMPTY)
}

const pageCount = computed(() =>
  list.data.value ? Math.max(1, Math.ceil(list.data.value.total / PAGE_SIZE)) : 1,
)

const entityOptions = computed(() => [
  { value: '', label: scope.selectedEntityId ? 'Périmètre sélectionné' : 'Toutes les entités' },
  ...refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
])
const cardOptions = computed(() => [
  { value: '', label: 'Toutes les cartes' },
  ...refData.cards.value.map((c) => ({
    value: c.id,
    label: `${refData.cardLabel(c.id)} — ${refData.userName(c.holderUserId)}`,
  })),
])
const userOptions = computed(() => [
  { value: '', label: 'Tous les collaborateurs' },
  ...refData.users.value.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
])
const categoryOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...refData.categories.value.map((c) => ({ value: c.id, label: c.name })),
])
const directionOptions = [
  { value: '', label: 'Débits et crédits' },
  { value: 'debit', label: 'Débits (dépenses)' },
  { value: 'credit', label: 'Crédits (entrées)' },
]
const receiptOptions = [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Justificatif manquant' },
  { value: 'false', label: 'Justificatif présent' },
]

const columns = computed<DataTableColumn[]>(() => [
  { key: 'label', label: 'Libellé bancaire' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'card', label: 'Carte', hideOnMobile: true },
  { key: 'holder', label: 'Collaborateur', hideOnMobile: true },
  { key: 'entity', label: 'Payé par' },
  ...(effectiveEntityId.value
    ? [
        {
          key: 'imputed',
          label: `Imputé à ${refData.entityName(effectiveEntityId.value)}`,
          numeric: true,
        },
      ]
    : []),
  { key: 'category', label: 'Catégorie', hideOnMobile: true },
  { key: 'match', label: 'Rapprochement' },
  { key: 'amount', label: 'Montant payé', numeric: true },
])

function retry() {
  void refData.load()
  void list.run()
  void all.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Transactions"
      description="Les débits sont les dépenses comptées dans les totaux. Une transaction sans facture rapprochée reste comptée, avec un justificatif manquant."
    >
      <template #actions>
        <BaseButton
          v-if="auth.can('transactions:import')"
          icon="upload"
          @click="router.push({ name: RouteName.TransactionImport })"
          >Importer un CSV</BaseButton
        >
      </template>
    </PageHeader>

    <FilterBar :active-count="activeCount" @clear="clearFilters">
      <BaseTextField
        v-model="filters.search"
        type="search"
        label="Recherche"
        placeholder="Libellé, contrepartie ou identifiant"
      />
      <BaseSelect
        v-model="filters.entityId"
        label="Entité (payé par ou imputé à)"
        :options="entityOptions"
      />
      <BaseSelect v-model="filters.cardId" label="Carte" :options="cardOptions" />
      <BaseSelect
        v-if="refData.users.value.length"
        v-model="filters.holderUserId"
        label="Collaborateur (porteur de carte)"
        :options="userOptions"
      />
      <BaseSelect v-model="filters.categoryId" label="Catégorie" :options="categoryOptions" />
      <BaseSelect v-model="filters.direction" label="Sens" :options="directionOptions" />
      <BaseSelect v-model="filters.missingReceipt" label="Justificatif" :options="receiptOptions" />
      <BaseTextField v-model="filters.bookedFrom" type="date" label="Du" />
      <BaseTextField v-model="filters.bookedTo" type="date" label="Au" />
    </FilterBar>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les transactions"
      loading-label="Chargement des transactions"
      @retry="retry"
    >
      <p class="result-count" data-testid="result-count">
        {{ list.data.value?.total ?? 0 }} transaction(s)
        <template v-if="effectiveEntityId && imputedTotal !== null">
          payée(s) par ou imputée(s) à {{ refData.entityName(effectiveEntityId) }} — débits imputés
          à cette entité :
          <strong class="tabular-nums" data-testid="imputed-total">{{
            formatCents(imputedTotal)
          }}</strong>
        </template>
      </p>
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="list.data.value?.items ?? []"
          row-key="id"
          caption="Liste des transactions"
        >
          <template #cell-label="{ row }">
            <RouterLink
              :to="{ name: RouteName.TransactionDetail, params: { transactionId: row.id } }"
              >{{ row.label }}</RouterLink
            >
          </template>
          <template #cell-bookingDate="{ row }">{{ formatIsoDate(row.bookingDate) }}</template>
          <template #cell-card="{ row }">{{ refData.cardLabel(row.cardId) }}</template>
          <template #cell-holder="{ row }">{{ refData.cardHolderName(row.cardId) }}</template>
          <template #cell-entity="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-imputed="{ row }">
            <template v-if="row.direction === 'debit' && effectiveEntityId">
              {{ formatCents(imputedPart(row, effectiveEntityId).amountCents) }}
              <span class="share"
                >({{ formatBasisPoints(imputedPart(row, effectiveEntityId).percentBp) }})</span
              >
            </template>
            <span v-else class="text-secondary">—</span>
          </template>
          <template #cell-category="{ row }">{{ refData.categoryName(row.categoryId) }}</template>
          <template #cell-match="{ row }">
            <StatusBadge v-if="row.missingReceipt" status="missing_receipt" size="sm" />
            <StatusBadge
              v-else-if="row.direction === 'debit'"
              v-bind="transactionMatchStatus(row)"
              size="sm"
            />
            <span v-else class="text-secondary">Entrée d'argent</span>
          </template>
          <template #cell-amount="{ row }">
            <span :class="row.direction === 'credit' ? 'credit' : ''">
              {{
                row.direction === 'debit'
                  ? formatCents(-row.amountCents)
                  : `+${formatCents(row.amountCents)}`
              }}
            </span>
          </template>
          <template #empty>
            <EmptyState
              v-if="activeCount"
              compact
              icon="search"
              title="Aucune transaction ne correspond à ces filtres"
            >
              <template #actions>
                <BaseButton variant="secondary" size="sm" @click="clearFilters"
                  >Effacer les filtres</BaseButton
                >
              </template>
            </EmptyState>
            <EmptyState
              v-else
              compact
              icon="transactions"
              title="Aucune transaction"
              description="Importez un relevé CSV pour commencer."
            />
          </template>
        </DataTable>
      </BaseCard>
      <BasePagination
        v-if="list.data.value && list.data.value.total > PAGE_SIZE"
        v-model:page="page"
        :page-count="pageCount"
        :total="list.data.value.total"
        item-label="transactions"
      />
    </AsyncContent>
  </div>
</template>

<style scoped>
.result-count {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.share {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.credit {
  color: var(--color-success-text);
}
</style>
