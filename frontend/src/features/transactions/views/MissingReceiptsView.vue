<script setup lang="ts">
/**
 * Justificatifs manquants : débits sans facture rapprochée ET confirmée (une suggestion en
 * attente ne suffit pas, hypothèse H4). La dépense est comptée quand même.
 * « Relancer le collaborateur » est SIMULÉ : aucun message n'est envoyé.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { DEMO_TODAY } from '@/config/demo'
import { daysBetween, formatIsoDate } from '@/core/dates/dates'
import { formatCents, sumCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { BankTransactionView } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '../shared/AsyncContent.vue'
import { useReferenceData } from '../shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

const list = useAsync(() =>
  services.transactions.listMissingReceipts({ entityId: scope.selectedEntityId ?? undefined }),
)
watch(
  () => scope.selectedEntityId,
  () => void list.run(),
)

/** Plus ancien d'abord ; un collaborateur (member) ne voit que les paiements de SES cartes. */
const rows = computed(() => {
  const ownCards = new Set(refData.cards.value.map((c) => c.id))
  return [...(list.data.value ?? [])]
    .filter((t) => auth.role !== 'member' || (t.cardId !== null && ownCards.has(t.cardId)))
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
})
const total = computed(() => sumCents(rows.value.map((t) => t.amountCents)))

const reminded = ref<string[]>([])
const lastReminder = ref('')
/** Relance SIMULÉE : on mémorise seulement l'action pour l'affichage. */
function remind(tx: BankTransactionView) {
  reminded.value = [...reminded.value, tx.id]
  const who = tx.cardId ? refData.cardHolderName(tx.cardId) : 'le responsable du compte'
  lastReminder.value = `Relance simulée pour ${who} (« ${tx.label} ») : aucun e-mail n'a été envoyé.`
}
const canRemind = computed(() => auth.can('reconciliations:validate'))

const columns: DataTableColumn[] = [
  { key: 'label', label: 'Libellé' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'holder', label: 'Collaborateur', hideOnMobile: true },
  { key: 'card', label: 'Carte', hideOnMobile: true },
  { key: 'since', label: 'Manquant depuis' },
  { key: 'amount', label: 'Montant', numeric: true },
  { key: 'actions', label: 'Actions' },
]

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

    <BaseAlert
      v-if="lastReminder"
      tone="info"
      title="Relance simulée"
      live
      dismissible
      data-testid="reminder-sent"
      @dismiss="lastReminder = ''"
    >
      {{ lastReminder }}
    </BaseAlert>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les justificatifs manquants"
      @retry="retry"
    >
      <p v-if="rows.length" data-testid="missing-summary">
        <strong>{{ rows.length }}</strong> dépense(s) sans justificatif, pour
        <strong class="tabular-nums">{{ formatCents(total) }}</strong>.
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
          <template #cell-card="{ row }">{{ refData.cardLabel(row.cardId) }}</template>
          <template #cell-since="{ row }">
            <StatusBadge
              tone="danger"
              icon="paperclip"
              :label="`${daysBetween(row.bookingDate, DEMO_TODAY)} jours`"
              size="sm"
            />
          </template>
          <template #cell-amount="{ row }">{{ formatCents(row.amountCents) }}</template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <RouterLink
                v-if="auth.can('reconciliations:read')"
                :to="{ name: RouteName.Reconciliations }"
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
</style>
