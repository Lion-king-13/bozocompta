<script setup lang="ts">
/**
 * Détail d'une transaction : montant, payé par (entité, carte, collaborateur), catégorie
 * (modifiable), rapprochement / justificatif et imputations analytiques.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseSelect,
  PageHeader,
  StatusBadge,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatBasisPoints, formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import type { Allocation, Invoice, Reconciliation } from '@/domain'
import { allocationsForTransaction } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '../shared/AsyncContent.vue'
import { transactionMatchStatus } from '../shared/labels'
import { useReferenceData } from '../shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const refData = useReferenceData()
void refData.load()

const transactionId = computed(() => String(route.params.transactionId))
const tx = useAsync(() => services.transactions.getTransaction(transactionId.value))
watch(transactionId, () => void tx.run())

const reconciliations = shallowRef<Reconciliation[]>([])
const linkedInvoice = shallowRef<Invoice | null>(null)
const allocations = shallowRef<Allocation[]>([])

watch(
  () => tx.data.value,
  async (current) => {
    if (!current) return
    categoryId.value = current.categoryId ?? ''
    reconciliations.value = []
    linkedInvoice.value = null
    try {
      const explicit = auth.can('allocations:read')
        ? await services.allocations.listAllocations({ transactionId: current.id })
        : []
      allocations.value = allocationsForTransaction(current, explicit)
      if (auth.can('reconciliations:read')) {
        reconciliations.value = (await services.reconciliations.listReconciliations()).filter(
          (r) => r.transactionId === current.id,
        )
        const confirmed = reconciliations.value.find((r) => r.status === 'confirmed')
        if (confirmed && auth.can('invoices:read'))
          linkedInvoice.value = await services.invoices.getInvoice(confirmed.invoiceId)
      }
    } catch {
      // Informations secondaires : la transaction reste consultable.
    }
  },
)

const categoryId = ref('')
const savingCategory = ref(false)
const categoryError = shallowRef<ApiError | null>(null)
const toast = useToasts()
const categoryOptions = computed(() => [
  { value: '', label: 'Non catégorisée' },
  ...refData.categories.value.map((c) => ({ value: c.id, label: c.name })),
])

async function saveCategory() {
  if (!tx.data.value) return
  savingCategory.value = true
  categoryError.value = null
  try {
    tx.data.value = await services.transactions.updateTransactionCategory(
      tx.data.value.id,
      categoryId.value || null,
    )
    toast.success('Catégorie enregistrée (corrigée par un utilisateur).')
  } catch (e) {
    categoryError.value = toApiError(e)
  } finally {
    savingCategory.value = false
  }
}

function retry() {
  void refData.load()
  void tx.run()
}
</script>

<template>
  <AsyncContent
    :loading="tx.loading.value && !tx.data.value"
    :error="tx.error.value ?? refData.error.value"
    :error-title="
      tx.error.value?.code === 'NOT_FOUND'
        ? 'Cette transaction est introuvable'
        : 'Impossible de charger la transaction'
    "
    skeleton="card"
    @retry="retry"
  >
    <div v-if="tx.data.value" class="stack" style="--stack-gap: var(--space-5)">
      <PageHeader
        :title="tx.data.value.label"
        :description="`${tx.data.value.counterpartyName} · ${formatIsoDate(tx.data.value.bookingDate)}`"
      >
        <template #breadcrumb>
          <RouterLink :to="{ name: RouteName.Transactions }">Transactions</RouterLink>
          <span aria-hidden="true"> / </span><span>Détail</span>
        </template>
        <template #meta>
          <StatusBadge v-if="tx.data.value.missingReceipt" status="missing_receipt" />
          <StatusBadge
            v-else-if="tx.data.value.direction === 'debit'"
            v-bind="transactionMatchStatus(tx.data.value)"
          />
        </template>
      </PageHeader>

      <div class="grid">
        <BaseCard title="Paiement">
          <dl class="facts">
            <div>
              <dt>Montant</dt>
              <dd class="amount tabular-nums">
                {{
                  tx.data.value.direction === 'debit'
                    ? formatCents(-tx.data.value.amountCents)
                    : `+${formatCents(tx.data.value.amountCents)}`
                }}
                <AiProvenanceBadge provenance="recorded" size="sm" />
              </dd>
            </div>
            <div>
              <dt>Sens</dt>
              <dd>
                {{
                  tx.data.value.direction === 'debit'
                    ? 'Débit (dépense)'
                    : 'Crédit (entrée d’argent, hors dépenses)'
                }}
              </dd>
            </div>
            <div>
              <dt>Payé par</dt>
              <dd>{{ refData.entityName(tx.data.value.entityId) }}</dd>
            </div>
            <div>
              <dt>Carte</dt>
              <dd>
                <RouterLink
                  v-if="tx.data.value.cardId && auth.can('cards:read')"
                  :to="{ name: RouteName.CardDetail, params: { cardId: tx.data.value.cardId } }"
                  >{{ refData.cardLabel(tx.data.value.cardId) }}</RouterLink
                >
                <template v-else>{{
                  tx.data.value.cardId
                    ? refData.cardLabel(tx.data.value.cardId)
                    : 'Virement / prélèvement'
                }}</template>
              </dd>
            </div>
            <div>
              <dt>Collaborateur</dt>
              <dd>{{ refData.cardHolderName(tx.data.value.cardId) }}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{{ tx.data.value.source === 'card' ? 'Paiement par carte' : 'Import CSV' }}</dd>
            </div>
          </dl>
        </BaseCard>

        <BaseCard title="Catégorie">
          <div class="stack">
            <p class="category-current">
              {{ refData.categoryName(tx.data.value.categoryId) }}
              <AiProvenanceBadge
                v-if="tx.data.value.categoryProvenance"
                :provenance="tx.data.value.categoryProvenance"
                size="sm"
                data-testid="category-provenance"
              />
            </p>
            <template v-if="auth.can('transactions:write')">
              <BaseSelect
                v-model="categoryId"
                label="Changer la catégorie"
                :options="categoryOptions"
              />
              <div>
                <BaseButton
                  variant="secondary"
                  :loading="savingCategory"
                  :disabled="categoryId === (tx.data.value.categoryId ?? '')"
                  data-testid="save-category"
                  @click="saveCategory"
                  >Enregistrer la catégorie</BaseButton
                >
              </div>
              <BaseAlert v-if="categoryError" tone="danger" live :data-code="categoryError.code">
                {{ categoryError.message }} Votre choix est conservé.
              </BaseAlert>
            </template>
          </div>
        </BaseCard>

        <BaseCard v-if="tx.data.value.direction === 'debit'" title="Justificatif et rapprochement">
          <template v-if="linkedInvoice">
            <StatusBadge status="reconciled" size="sm" />
            <p>
              Facture
              <RouterLink
                :to="{ name: RouteName.InvoiceDetail, params: { invoiceId: linkedInvoice.id } }"
                >{{ linkedInvoice.number }}</RouterLink
              >
              ({{ refData.supplierName(linkedInvoice.supplierId) }},
              {{ formatCents(linkedInvoice.totalInclVatCents) }} TTC)
            </p>
          </template>
          <template v-else>
            <p>
              Aucune facture rapprochée et confirmée : la dépense est comptée, mais le justificatif
              manque.
            </p>
            <p v-if="tx.data.value.reconciliationStatus === 'suggested'">
              <AiProvenanceBadge provenance="suggested" size="sm" /> Une suggestion attend votre
              décision.
            </p>
            <RouterLink
              v-if="auth.can('reconciliations:read')"
              :to="{ name: RouteName.Reconciliations }"
              >Aller aux rapprochements</RouterLink
            >
          </template>
        </BaseCard>

        <BaseCard v-if="tx.data.value.direction === 'debit'" title="Imputé à">
          <ul class="alloc-list" data-testid="transaction-allocations">
            <li v-for="a in allocations" :key="a.id">
              <span>{{ refData.targetLabel(a.entityId, a.costCenterId) }}</span>
              <span class="tabular-nums"
                >{{ formatBasisPoints(a.percentBp) }} · {{ formatCents(a.amountCents) }}</span
              >
            </li>
          </ul>
          <p
            v-if="allocations.length === 1 && allocations[0]?.id.startsWith('implicit')"
            class="small text-secondary"
          >
            Sans ventilation : 100 % à l'entité payeuse.
          </p>
          <RouterLink
            v-if="auth.can('allocations:read')"
            :to="{ name: RouteName.AllocationEditor, params: { transactionId: tx.data.value.id } }"
            >{{
              auth.can('allocations:write') ? 'Modifier la répartition' : 'Voir la répartition'
            }}</RouterLink
          >
        </BaseCard>
      </div>
    </div>
  </AsyncContent>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  align-items: start;
}
.facts {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
  margin: 0;
}
.facts dt {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.facts dd {
  margin: var(--space-1) 0 0;
}
.amount {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}
.category-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-weight: var(--font-weight-medium);
}
.alloc-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.alloc-list li {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.small {
  font-size: var(--font-size-sm);
}
</style>
