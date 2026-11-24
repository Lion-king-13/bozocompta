<script setup lang="ts">
/**
 * Liste des factures : filtres (statut, entité, fournisseur, période, recherche), tri,
 * pagination et compteur « à valider ». Les filtres sont appliqués par le service.
 * Rappel (arbitrage D1) : une facture n'ajoute rien aux dépenses ; c'est un justificatif.
 */
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseAlert,
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
  type SortDirection,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import {
  INVOICE_STATUS_LABELS,
  type InvoiceQuery,
  type InvoiceSortKey,
  type InvoiceStatus,
} from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import FilterBar from '@/features/transactions/shared/FilterBar.vue'
import { INVOICE_STATUS_TO_UI, PROVENANCE_TO_UI } from '@/features/transactions/shared/labels'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'

const PAGE_SIZE = 10
const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const route = useRoute()
const router = useRouter()
const refData = useReferenceData()
void refData.load()

const filters = reactive({
  search: '',
  status: '' as InvoiceStatus | '',
  entityId: '',
  supplierId: '',
  from: '',
  to: '',
})
const sort = ref<{ key: InvoiceSortKey; direction: SortDirection }>({
  key: 'issueDate',
  direction: 'descending',
})
const page = ref(1)

/** Entité effective : filtre de la page, sinon périmètre choisi dans l'en-tête. */
const effectiveEntityId = computed(() => filters.entityId || scope.selectedEntityId || undefined)

const query = computed<InvoiceQuery>(() => ({
  search: filters.search.trim() || undefined,
  status: filters.status || undefined,
  entityId: effectiveEntityId.value,
  supplierId: filters.supplierId || undefined,
  issuedFrom: filters.from || undefined,
  issuedTo: filters.to || undefined,
  sortBy: sort.value.key,
  sortDirection: sort.value.direction === 'ascending' ? 'asc' : 'desc',
  page: page.value,
  pageSize: PAGE_SIZE,
}))

const list = useAsync(() => services.invoices.listInvoices(query.value))
const toReview = useAsync(() =>
  services.invoices.listInvoices({
    status: 'to_review',
    entityId: effectiveEntityId.value,
    pageSize: 1,
  }),
)

watch(
  () => ({ ...filters, scope: scope.selectedEntityId }),
  () => {
    page.value = 1
    void list.run()
    void toReview.run()
  },
)
watch([page, sort], () => void list.run())

const activeCount = computed(
  () =>
    [
      filters.search,
      filters.status,
      filters.entityId,
      filters.supplierId,
      filters.from,
      filters.to,
    ].filter(Boolean).length,
)
function clearFilters() {
  Object.assign(filters, { search: '', status: '', entityId: '', supplierId: '', from: '', to: '' })
}
function showToReview() {
  clearFilters()
  filters.status = 'to_review'
}

const pageCount = computed(() =>
  list.data.value ? Math.max(1, Math.ceil(list.data.value.total / PAGE_SIZE)) : 1,
)

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  ...(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((s) => ({
    value: s,
    label: INVOICE_STATUS_LABELS[s],
  })),
]
const entityOptions = computed(() => [
  { value: '', label: scope.selectedEntityId ? 'Périmètre sélectionné' : 'Toutes les entités' },
  ...refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
])
const supplierOptions = computed(() => [
  { value: '', label: 'Tous les fournisseurs' },
  ...refData.suppliers.value.map((s) => ({ value: s.id, label: s.name })),
])

const columns: DataTableColumn[] = [
  { key: 'number', label: 'N° de facture', sortable: true, width: '10rem' },
  { key: 'supplier', label: 'Fournisseur' },
  { key: 'issueDate', label: 'Émise le', sortable: true },
  { key: 'dueDate', label: 'Échéance', sortable: true, hideOnMobile: true },
  { key: 'entity', label: 'Entité', hideOnMobile: true },
  { key: 'status', label: 'Statut' },
  { key: 'provenance', label: 'Provenance', hideOnMobile: true },
  { key: 'totalInclVatCents', label: 'Montant TTC', numeric: true, sortable: true },
]

function onSort(key: string, direction: SortDirection) {
  sort.value = { key: key as InvoiceSortKey, direction }
}

function retry() {
  void refData.load()
  void list.run()
  void toReview.run()
}

/** Facture tout juste importée (retour de l'écran d'import). */
const createdNumber = computed(() =>
  typeof route.query.created === 'string' ? route.query.created : null,
)
function dismissCreated() {
  void router.replace({ name: RouteName.Invoices })
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Factures"
      description="Justificatifs fournisseurs. Une facture n'ajoute rien aux dépenses : la dépense est le paiement (transaction)."
    >
      <template #actions>
        <BaseButton
          v-if="auth.can('invoices:import')"
          icon="upload"
          @click="router.push({ name: RouteName.InvoiceImport })"
          >Importer une facture</BaseButton
        >
      </template>
    </PageHeader>

    <BaseAlert
      v-if="createdNumber"
      tone="success"
      title="Facture validée et enregistrée"
      dismissible
      live
      data-testid="invoice-created"
      @dismiss="dismissCreated"
    >
      La facture {{ createdNumber }} figure maintenant dans la liste.
    </BaseAlert>

    <div class="counter">
      <StatusBadge status="to_validate" />
      <span data-testid="to-review-count">
        <strong>{{ toReview.data.value?.total ?? '…' }}</strong> facture(s) à valider
      </span>
      <BaseButton variant="ghost" size="sm" @click="showToReview">Afficher</BaseButton>
    </div>

    <FilterBar :active-count="activeCount" @clear="clearFilters">
      <BaseTextField
        v-model="filters.search"
        type="search"
        label="Recherche"
        placeholder="N° ou fournisseur"
      />
      <BaseSelect v-model="filters.status" label="Statut" :options="statusOptions" />
      <BaseSelect v-model="filters.entityId" label="Entité" :options="entityOptions" />
      <BaseSelect v-model="filters.supplierId" label="Fournisseur" :options="supplierOptions" />
      <BaseTextField v-model="filters.from" type="date" label="Émise à partir du" />
      <BaseTextField v-model="filters.to" type="date" label="Émise jusqu'au" />
    </FilterBar>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les factures"
      loading-label="Chargement des factures"
      @retry="retry"
    >
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="list.data.value?.items ?? []"
          row-key="id"
          caption="Liste des factures"
          :sort-key="sort.key"
          :sort-direction="sort.direction"
          @sort="onSort"
        >
          <template #cell-number="{ row }">
            <RouterLink :to="{ name: RouteName.InvoiceDetail, params: { invoiceId: row.id } }">{{
              row.number
            }}</RouterLink>
          </template>
          <template #cell-supplier="{ row }">{{ refData.supplierName(row.supplierId) }}</template>
          <template #cell-issueDate="{ row }">{{ formatIsoDate(row.issueDate) }}</template>
          <template #cell-dueDate="{ row }">{{ formatIsoDate(row.dueDate) }}</template>
          <template #cell-entity="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-status="{ row }">
            <StatusBadge :status="INVOICE_STATUS_TO_UI[row.status]" size="sm" />
          </template>
          <template #cell-provenance="{ row }">
            <AiProvenanceBadge :provenance="PROVENANCE_TO_UI[row.provenance]" size="sm" />
          </template>
          <template #cell-totalInclVatCents="{ row }">{{
            formatCents(row.totalInclVatCents)
          }}</template>
          <template #empty>
            <EmptyState
              v-if="activeCount"
              compact
              icon="search"
              title="Aucune facture ne correspond à ces filtres"
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
              icon="receipt"
              title="Aucune facture pour l'instant"
              description="Importez une facture PDF : l'IA en propose les valeurs, vous les validez."
            />
          </template>
        </DataTable>
      </BaseCard>
      <BasePagination
        v-if="list.data.value && list.data.value.total > PAGE_SIZE"
        v-model:page="page"
        :page-count="pageCount"
        :total="list.data.value.total"
        item-label="factures"
      />
    </AsyncContent>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}
</style>
