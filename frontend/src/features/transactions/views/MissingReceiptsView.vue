<script setup lang="ts">
/**
 * Justificatifs manquants : débits sans facture rapprochée ET confirmée (une suggestion en
 * attente ne suffit pas, hypothèse H4). La dépense est comptée quand même.
 * - `?entityId=` est lu dans l'URL et y est réécrit (QA-01) ; à l'arrivée il prime sur le
 *   périmètre de l'en-tête. Filtrée sur une entité, la liste contient les débits payés par OU
 *   imputés à cette entité (D7) et affiche la part imputée (QA-05).
 * - « Associer une facture » ouvre le rapprochement manuel avec la transaction choisie (QA-24).
 * - « Relancer le collaborateur » est SIMULÉ : aucun message n'est envoyé.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  BaseButton,
  BaseCard,
  BaseSelect,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { DEMO_TODAY } from '@/config/demo'
import { daysBetween, formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents, sumCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import type { BankTransactionView } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '../shared/AsyncContent.vue'
import FilterBar from '../shared/FilterBar.vue'
import { imputedPart } from '../shared/imputation'
import { useQueryFilters } from '../shared/useQueryFilters'
import { useReferenceData } from '../shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const toast = useToasts()
const refData = useReferenceData()
void refData.load()

const filters = useQueryFilters({ entityId: '' })
const effectiveEntityId = computed(() => filters.entityId || scope.selectedEntityId || undefined)

const list = useAsync(() =>
  services.transactions.listMissingReceipts({ entityId: effectiveEntityId.value }),
)
watch(effectiveEntityId, () => void list.run())

/** Plus ancien d'abord (le service limite déjà un collaborateur à ses propres cartes). */
const rows = computed(() =>
  [...(list.data.value ?? [])].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate)),
)
const total = computed(() => sumCents(rows.value.map((t) => t.amountCents)))
const imputedTotal = computed(() => {
  const entityId = effectiveEntityId.value
  return entityId ? sumCents(rows.value.map((t) => imputedPart(t, entityId).amountCents)) : null
})

const reminded = ref<string[]>([])
/** Relance SIMULÉE : on mémorise seulement l'action pour l'affichage. */
function remind(tx: BankTransactionView) {
  reminded.value = [...reminded.value, tx.id]
  const who = tx.cardId ? refData.cardHolderName(tx.cardId) : 'le responsable du compte'
  toast.info(`Relance simulée pour ${who} (« ${tx.label} ») : aucun e-mail n'a été envoyé.`)
}
const canRemind = computed(() => auth.can('reconciliations:validate'))

const entityOptions = computed(() => [
  { value: '', label: scope.selectedEntityId ? 'Périmètre sélectionné' : 'Toutes les entités' },
  ...refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
])

const columns = computed<DataTableColumn[]>(() => [
  { key: 'label', label: 'Libellé' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'holder', label: 'Collaborateur', hideOnMobile: true },
  { key: 'paidBy', label: 'Payé par', hideOnMobile: true },
  { key: 'since', label: 'Manquant depuis' },
  ...(effectiveEntityId.value
    ? [
        {
          key: 'imputed',
          label: `Imputé à ${refData.entityName(effectiveEntityId.value)}`,
          numeric: true,
        },
      ]
    : []),
  { key: 'amount', label: 'Montant payé', numeric: true },
  { key: 'actions', label: 'Actions' },
])

function retry() {
  void refData.load()
  void list.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Justificatifs manquants"
      description="Dépenses sans facture rapprochée et confirmée. Elles restent comptées dans les totaux."
    />

    <FilterBar :active-count="filters.entityId ? 1 : 0" @clear="filters.entityId = ''">
      <BaseSelect
        v-model="filters.entityId"
        label="Entité (payé par ou imputé à)"
        :options="entityOptions"
      />
    </FilterBar>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les justificatifs manquants"
      @retry="retry"
    >
      <p v-if="rows.length" data-testid="missing-summary">
        <strong>{{ rows.length }}</strong> dépense(s) sans justificatif, pour
        <strong class="tabular-nums">{{ formatCents(total) }}</strong> payés<template
          v-if="effectiveEntityId && imputedTotal !== null"
        >
          , dont
          <strong class="tabular-nums" data-testid="imputed-total">{{
            formatCents(imputedTotal)
          }}</strong>
          imputés à {{ refData.entityName(effectiveEntityId) }}</template
        >.
      </p>
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="rows"
          row-key="id"
          caption="Transactions sans justificatif"
        >
          <template #cell-label="{ row }">
            <RouterLink
              :to="{ name: RouteName.TransactionDetail, params: { transactionId: row.id } }"
              >{{ row.label }}</RouterLink
            >
          </template>
          <template #cell-bookingDate="{ row }">{{ formatIsoDate(row.bookingDate) }}</template>
          <template #cell-holder="{ row }">{{ refData.cardHolderName(row.cardId) }}</template>
          <template #cell-paidBy="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-since="{ row }">
            <StatusBadge
              tone="danger"
              icon="paperclip"
              :label="`${daysBetween(row.bookingDate, DEMO_TODAY)} jours`"
              size="sm"
            />
          </template>
          <template #cell-imputed="{ row }">
            <template v-if="effectiveEntityId">
              {{ formatCents(imputedPart(row, effectiveEntityId).amountCents) }}
              <span class="share"
                >({{ formatBasisPoints(imputedPart(row, effectiveEntityId).percentBp) }})</span
              >
            </template>
          </template>
          <template #cell-amount="{ row }">{{ formatCents(row.amountCents) }}</template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <RouterLink
                v-if="auth.can('reconciliations:validate')"
                :to="{ name: RouteName.Reconciliations, query: { transactionId: row.id } }"
                data-testid="associate-invoice"
                >Associer une facture</RouterLink
              >
              <BaseButton
                v-if="canRemind"
                variant="ghost"
                size="sm"
                :disabled="reminded.includes(row.id)"
                @click="remind(row)"
                >{{
                  reminded.includes(row.id) ? 'Relance simulée envoyée' : 'Relancer (simulé)'
                }}</BaseButton
              >
            </div>
          </template>
          <template #empty>
            <EmptyState compact icon="check-circle" title="Tous les justificatifs sont présents" />
          </template>
        </DataTable>
      </BaseCard>
    </AsyncContent>
  </div>
</template>

<style scoped>
.row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.share {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
