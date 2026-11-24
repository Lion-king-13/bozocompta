<script setup lang="ts">
/**
 * Rapprochements facture ↔ transaction (validation humaine).
 * - Suggestions de l'IA : à confirmer ou rejeter (trace : qui, quand).
 * - Rapprochement manuel : choisir une transaction pour une facture.
 * Un rapprochement n'est qu'un LIEN : confirmer ou rejeter ne change aucun total de dépenses.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseDialog,
  BaseSelect,
  BaseTabs,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  type DataTableColumn,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { Reconciliation } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import ReconciliationCard from '../components/ReconciliationCard.vue'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

/** Rapprochements + factures + transactions visibles (pour afficher les deux côtés). */
const data = useAsync(async () => {
  const [reconciliations, invoices, transactions] = await Promise.all([
    services.reconciliations.listReconciliations({ entityId: scope.selectedEntityId ?? undefined }),
    auth.can('invoices:read')
      ? services.invoices.listInvoices({ pageSize: 200 }).then((p) => p.items)
      : Promise.resolve([]),
    services.transactions.listTransactions({ pageSize: 200 }).then((p) => p.items),
  ])
  return { reconciliations, invoices, transactions }
})
watch(
  () => scope.selectedEntityId,
  () => void data.run(),
)

const invoiceById = computed(() => new Map((data.data.value?.invoices ?? []).map((i) => [i.id, i])))
const txById = computed(() => new Map((data.data.value?.transactions ?? []).map((t) => [t.id, t])))
const byStatus = (status: Reconciliation['status']) =>
  (data.data.value?.reconciliations ?? []).filter((r) => r.status === status)
const suggested = computed(() => byStatus('suggested'))
const confirmed = computed(() => byStatus('confirmed'))
const rejected = computed(() => byStatus('rejected'))

const tab = ref('suggestions')
const tabs = computed(() => [
  { id: 'suggestions', label: 'Suggestions', count: suggested.value.length },
  { id: 'confirmed', label: 'Rapprochées', count: confirmed.value.length },
  { id: 'rejected', label: 'Rejetées', count: rejected.value.length },
])

const canDecide = computed(() => auth.can('reconciliations:validate'))
const busyId = ref<string | null>(null)
const feedback = ref('')
const actionError = shallowRef<ApiError | null>(null)

/** Remplace un rapprochement dans la liste locale (sans recharger toute la page). */
function replaceLocal(updated: Reconciliation) {
  const current = data.data.value
  if (!current) return
  const exists = current.reconciliations.some((r) => r.id === updated.id)
  data.data.value = {
    ...current,
    reconciliations: exists
      ? current.reconciliations.map((r) => (r.id === updated.id ? updated : r))
      : [...current.reconciliations, updated],
  }
}

function decisionText(r: Reconciliation): string {
  const who = r.decidedByUserId ? refData.userName(r.decidedByUserId) : '—'
  const when = r.decidedAt ? formatIsoDate(r.decidedAt.slice(0, 10)) : '—'
  return `${who}, le ${when}`
}

async function decide(r: Reconciliation, action: 'confirm' | 'reject') {
  busyId.value = r.id
  feedback.value = ''
  actionError.value = null
  try {
    const updated =
      action === 'confirm'
        ? await services.reconciliations.confirmReconciliation(r.id)
        : await services.reconciliations.rejectReconciliation(r.id)
    replaceLocal(updated)
    feedback.value =
      action === 'confirm'
        ? `Rapprochement confirmé par ${decisionText(updated)}. Les totaux de dépenses ne changent pas.`
        : `Suggestion rejetée par ${decisionText(updated)}. La transaction reste sans justificatif.`
  } catch (e) {
    actionError.value = toApiError(e)
    if (actionError.value.code === 'CONFLICT') void data.run()
  } finally {
    busyId.value = null
  }
}

/** Nouvelles suggestions (opération IA : peut échouer si l'IA est indisponible ou le quota atteint). */
const suggesting = ref(false)
const suggestError = shallowRef<ApiError | null>(null)
async function runSuggestions() {
  suggesting.value = true
  suggestError.value = null
  feedback.value = ''
  try {
    const created = await services.reconciliations.suggestReconciliations()
    created.forEach(replaceLocal)
    feedback.value = created.length
      ? `${created.length} nouvelle(s) suggestion(s) à vérifier.`
      : 'Aucune nouvelle correspondance trouvée.'
    tab.value = 'suggestions'
  } catch (e) {
    suggestError.value = toApiError(e)
  } finally {
    suggesting.value = false
  }
}

/* ---- Rapprochement manuel ---- */
const manualOpen = ref(false)
const manualInvoiceId = ref('')
const manualTxId = ref('')
const manualError = shallowRef<ApiError | null>(null)
const manualSaving = ref(false)

const linkedInvoiceIds = computed(() => new Set(confirmed.value.map((r) => r.invoiceId)))
const linkedTxIds = computed(() => new Set(confirmed.value.map((r) => r.transactionId)))
const freeInvoiceOptions = computed(() =>
  (data.data.value?.invoices ?? [])
    .filter((i) => i.status !== 'cancelled' && !linkedInvoiceIds.value.has(i.id))
    .map((i) => ({
      value: i.id,
      label: `${refData.supplierName(i.supplierId)} · ${i.number} · ${formatCents(i.totalInclVatCents)}`,
    })),
)
const freeTxOptions = computed(() =>
  (data.data.value?.transactions ?? [])
    .filter((t) => t.direction === 'debit' && !linkedTxIds.value.has(t.id))
    .map((t) => ({
      value: t.id,
      label: `${formatIsoDate(t.bookingDate)} · ${t.counterpartyName} · ${formatCents(t.amountCents)}`,
    })),
)
const manualDifference = computed(() => {
  const invoice = invoiceById.value.get(manualInvoiceId.value)
  const tx = txById.value.get(manualTxId.value)
  return invoice && tx ? tx.amountCents - invoice.totalInclVatCents : null
})

function openManual(invoiceId = '') {
  manualInvoiceId.value = invoiceId
  manualTxId.value = ''
  manualError.value = null
  manualOpen.value = true
}

async function saveManual() {
  manualSaving.value = true
  manualError.value = null
  try {
    const created = await services.reconciliations.createManualReconciliation(
      manualInvoiceId.value,
      manualTxId.value,
    )
    replaceLocal(created)
    manualOpen.value = false
    feedback.value = `Rapprochement manuel enregistré par ${decisionText(created)}.`
    tab.value = 'confirmed'
  } catch (e) {
    manualError.value = toApiError(e)
  } finally {
    manualSaving.value = false
  }
}

const historyColumns: DataTableColumn[] = [
  { key: 'invoice', label: 'Facture' },
  { key: 'transaction', label: 'Transaction' },
  { key: 'amount', label: 'Montant payé', numeric: true },
  { key: 'origin', label: 'Origine', hideOnMobile: true },
  { key: 'decision', label: 'Décision (qui, quand)' },
]

function retry() {
  void refData.load()
  void data.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Rapprochements"
      description="Associez chaque facture à son paiement. L'IA propose, vous décidez. Un rapprochement ne change aucun total de dépenses."
    >
      <template #actions>
        <BaseButton
          v-if="auth.can('reconciliations:read')"
          variant="secondary"
          icon="sparkle"
          :loading="suggesting"
          data-testid="run-suggestions"
          @click="runSuggestions"
          >Chercher des correspondances (IA)</BaseButton
        >
        <BaseButton v-if="canDecide" icon="link" @click="openManual()"
          >Rapprocher manuellement</BaseButton
        >
      </template>
    </PageHeader>

    <BaseAlert
      v-if="feedback"
      tone="success"
      live
      dismissible
      data-testid="reconciliation-feedback"
      @dismiss="feedback = ''"
    >
      {{ feedback }}
    </BaseAlert>
    <BaseAlert
      v-if="actionError"
      tone="danger"
      title="L'action n'a pas abouti"
      live
      :data-code="actionError.code"
    >
      {{ actionError.message }}
      <template v-if="actionError.code === 'CONFLICT'"> La liste a été actualisée.</template>
    </BaseAlert>
    <BaseAlert v-if="!canDecide" tone="info">
      Lecture seule : votre rôle ne permet pas de confirmer ou rejeter un rapprochement.
    </BaseAlert>

    <AsyncContent
      :loading="data.loading.value && !data.data.value"
      :error="data.error.value ?? refData.error.value"
      error-title="Impossible de charger les rapprochements"
      @retry="retry"
    >
      <BaseTabs v-model="tab" :tabs="tabs" label="Rapprochements">
        <template #panel-suggestions>
          <div class="stack">
            <div v-if="suggestError" data-testid="suggest-error" :data-code="suggestError.code">
              <ErrorState
                compact
                :title="
                  suggestError.code === 'AI_QUOTA_EXCEEDED'
                    ? 'Quota IA atteint'
                    : suggestError.code === 'AI_UNAVAILABLE'
                      ? 'Service IA indisponible'
                      : 'La recherche n’a pas abouti'
                "
                :message="`${suggestError.message} Le rapprochement manuel reste possible.`"
                :code="suggestError.code"
                :retrying="suggesting"
                @retry="runSuggestions"
              >
                <template #actions>
                  <BaseButton v-if="canDecide" variant="secondary" size="sm" @click="openManual()"
                    >Rapprocher manuellement</BaseButton
                  >
                </template>
              </ErrorState>
            </div>
            <p class="text-secondary small">
              Le score est indicatif (montant identique, date proche, fournisseur reconnu). Aucune
              suggestion n'est appliquée sans votre confirmation.
            </p>
            <ReconciliationCard
              v-for="r in suggested"
              :key="r.id"
              :reconciliation="r"
              :invoice="invoiceById.get(r.invoiceId)"
              :transaction="txById.get(r.transactionId)"
              :supplier-name="refData.supplierName(invoiceById.get(r.invoiceId)?.supplierId)"
              :card-text="
                txById.get(r.transactionId)?.cardId
                  ? `carte ${refData.cardLabel(txById.get(r.transactionId)?.cardId)}`
                  : 'virement / prélèvement'
              "
              :can-decide="canDecide"
              :busy="busyId === r.id"
              @confirm="decide(r, 'confirm')"
              @reject="decide(r, 'reject')"
            />
            <EmptyState
              v-if="suggested.length === 0"
              compact
              icon="check-circle"
              title="Aucune suggestion en attente"
            />
          </div>
        </template>

        <template
          v-for="panel in ['confirmed', 'rejected'] as const"
          :key="panel"
          #[`panel-${panel}`]
        >
          <BaseCard flush>
            <DataTable
              :columns="historyColumns"
              :rows="panel === 'confirmed' ? confirmed : rejected"
              row-key="id"
              :caption="panel === 'confirmed' ? 'Rapprochements confirmés' : 'Suggestions rejetées'"
            >
              <template #cell-invoice="{ row }">
                <RouterLink
                  v-if="invoiceById.get(row.invoiceId)"
                  :to="{ name: RouteName.InvoiceDetail, params: { invoiceId: row.invoiceId } }"
                >
                  {{ invoiceById.get(row.invoiceId)?.number }}
                </RouterLink>
                <span class="text-secondary">
                  {{ refData.supplierName(invoiceById.get(row.invoiceId)?.supplierId) }}</span
                >
              </template>
              <template #cell-transaction="{ row }">
                <RouterLink
                  :to="{
                    name: RouteName.TransactionDetail,
                    params: { transactionId: row.transactionId },
                  }"
                >
                  {{ txById.get(row.transactionId)?.label ?? row.transactionId }}
                </RouterLink>
              </template>
              <template #cell-amount="{ row }">{{
                formatCents(txById.get(row.transactionId)?.amountCents ?? 0)
              }}</template>
              <template #cell-origin="{ row }">
                <AiProvenanceBadge
                  v-if="row.origin === 'ai_suggestion'"
                  :provenance="panel === 'confirmed' ? 'validated' : 'suggested'"
                  detail="suggestion IA"
                  size="sm"
                />
                <span v-else>Manuel</span>
              </template>
              <template #cell-decision="{ row }">{{ decisionText(row) }}</template>
              <template #empty>
                <EmptyState
                  compact
                  :title="
                    panel === 'confirmed'
                      ? 'Aucun rapprochement confirmé'
                      : 'Aucune suggestion rejetée'
                  "
                />
              </template>
            </DataTable>
          </BaseCard>
        </template>
      </BaseTabs>
    </AsyncContent>

    <BaseDialog
      v-model:open="manualOpen"
      title="Rapprocher manuellement"
      description="Choisissez la facture et le paiement correspondant."
      size="md"
      :persistent="manualSaving"
    >
      <div class="stack">
        <BaseSelect
          v-model="manualInvoiceId"
          label="Facture"
          :options="freeInvoiceOptions"
          placeholder="Choisir une facture"
          required
        />
        <BaseSelect
          v-model="manualTxId"
          label="Transaction (paiement)"
          :options="freeTxOptions"
          placeholder="Choisir une transaction"
          required
        />
        <BaseAlert v-if="manualDifference !== null && manualDifference !== 0" tone="warning">
          Écart de {{ formatCents(Math.abs(manualDifference)) }} entre la facture et le paiement.
          Vérifiez avant de confirmer.
        </BaseAlert>
        <BaseAlert v-if="manualError" tone="danger" live :data-code="manualError.code">{{
          manualError.message
        }}</BaseAlert>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="manualSaving" @click="manualOpen = false"
          >Annuler</BaseButton
        >
        <BaseButton
          icon="link"
          :loading="manualSaving"
          :disabled="!manualInvoiceId || !manualTxId"
          data-testid="save-manual"
          @click="saveManual"
          >Confirmer le rapprochement</BaseButton
        >
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.small {
  font-size: var(--font-size-sm);
}
</style>
