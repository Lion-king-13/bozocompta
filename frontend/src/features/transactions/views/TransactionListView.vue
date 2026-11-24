<script setup lang="ts">
/**
 * Transactions bancaires = unités de dépense (débits). Filtres : entité, carte,
 * collaborateur, catégorie, période, sens, justificatif. Filtrage fait par le service.
 */
import { computed, reactive, ref, watch } from 'vue'
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
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { BankTransactionQuery, TransactionDirection } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '../shared/AsyncContent.vue'
import FilterBar from '../shared/FilterBar.vue'
import { transactionMatchStatus } from '../shared/labels'
import { useReferenceData } from '../shared/useReferenceData'

const PAGE_SIZE = 10
const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const router = useRouter()
const refData = useReferenceData()
void refData.load()

const filters = reactive({
  search: '',
  entityId: '',
  cardId: '',
  userId: '',
  categoryId: '',
  direction: '' as TransactionDirection | '',
  receipt: '' as '' | 'missing' | 'present',
  from: '',
  to: '',
})
const page = ref(1)

const query = computed<BankTransactionQuery>(() => ({
  search: filters.search.trim() || undefined,
  entityId: filters.entityId || scope.selectedEntityId || undefined,
  cardId: filters.cardId || undefined,
  holderUserId: filters.userId || undefined,
  categoryId: filters.categoryId || undefined,
  direction: filters.direction || undefined,
  missingReceipt: filters.receipt === '' ? undefined : filters.receipt === 'missing',
  bookedFrom: filters.from || undefined,
  bookedTo: filters.to || undefined,
  page: page.value,
  pageSize: PAGE_SIZE,
}))

const list = useAsync(() => services.transactions.listTransactions(query.value))
watch(
  () => ({ ...filters, scope: scope.selectedEntityId }),
  () => {
    page.value = 1
    void list.run()
  },
)
watch(page, () => void list.run())

const activeCount = computed(() => Object.values(filters).filter(Boolean).length)
function clearFilters() {
  Object.assign(filters, {
    search: '',
    entityId: '',
    cardId: '',
    userId: '',
    categoryId: '',
    direction: '',
    receipt: '',
    from: '',
    to: '',
  })
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
  { value: 'missing', label: 'Justificatif manquant' },
  { value: 'present', label: 'Justificatif présent' },
]

const columns: DataTableColumn[] = [
  { key: 'label', label: 'Libellé bancaire' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'card', label: 'Carte', hideOnMobile: true },
  { key: 'holder', label: 'Collaborateur', hideOnMobile: true },
  { key: 'entity', label: 'Payé par', hideOnMobile: true },
  { key: 'category', label: 'Catégorie', hideOnMobile: true },
  { key: 'match', label: 'Rapprochement' },
  { key: 'amount', label: 'Montant', numeric: true },
]

function retry() {
  void refData.load()
  void list.run()
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
        placeholder="Libellé ou contrepartie"
      />
      <BaseSelect v-model="filters.entityId" label="Entité payeuse" :options="entityOptions" />
      <BaseSelect v-model="filters.cardId" label="Carte" :options="cardOptions" />
      <BaseSelect
        v-if="refData.users.value.length"
        v-model="filters.userId"
        label="Collaborateur (porteur de carte)"
        :options="userOptions"
      />
      <BaseSelect v-model="filters.categoryId" label="Catégorie" :options="categoryOptions" />
      <BaseSelect v-model="filters.direction" label="Sens" :options="directionOptions" />
      <BaseSelect v-model="filters.receipt" label="Justificatif" :options="receiptOptions" />
      <BaseTextField v-model="filters.from" type="date" label="Du" />
      <BaseTextField v-model="filters.to" type="date" label="Au" />
    </FilterBar>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les transactions"
      loading-label="Chargement des transactions"
      @retry="retry"
    >
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
.credit {
  color: var(--color-success-text);
}
</style>
