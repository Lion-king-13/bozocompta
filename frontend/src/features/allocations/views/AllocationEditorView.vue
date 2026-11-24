<script setup lang="ts">
/**
 * Répartition analytique d'UNE transaction (dépense) entre plusieurs imputations.
 * Exemple obligatoire : 3 000 € payés par Alice (carte belge) → Belgique 60 % = 1 800 €,
 * Projet France 40 % = 1 200 €. Une seule dépense : la ventilation ne crée ni dépense
 * supplémentaire ni écriture intersociétés, et le total de l'organisation ne bouge pas.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AiProvenanceBadge, BaseAlert, BaseButton, BaseCard, PageHeader } from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import { allocationsForTransaction } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import {
  linesFromAllocations,
  previewAllocation,
  toAllocationInputs,
  type AllocationLineForm,
} from '../allocationEditor'
import AllocationEditor from '../components/AllocationEditor.vue'

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const refData = useReferenceData()
void refData.load()

const transactionId = computed(() => String(route.params.transactionId))

/** Transaction + allocations explicites, chargées ensemble. */
const data = useAsync(async () => {
  const [transaction, explicit] = await Promise.all([
    services.transactions.getTransaction(transactionId.value),
    services.allocations.listAllocations({ transactionId: transactionId.value }),
  ])
  return { transaction, explicit }
})
/** Total des dépenses de l'organisation (preuve que la ventilation ne le change pas). */
const orgTotal = useAsync(() => services.dashboard.getSummary({ entityId: null }))

const lines = ref<AllocationLineForm[]>([])
const saving = ref(false)
const saveError = shallowRef<ApiError | null>(null)
const toast = useToasts()

function resetLines() {
  const current = data.data.value
  if (!current) return
  lines.value = linesFromAllocations(
    allocationsForTransaction(current.transaction, current.explicit),
  )
}
watch(() => data.data.value, resetLines)
watch(transactionId, () => void data.run())

const canWrite = computed(() => auth.can('allocations:write'))
const isDebit = computed(() => data.data.value?.transaction.direction === 'debit')
const isExplicit = computed(() => (data.data.value?.explicit.length ?? 0) > 0)
const preview = computed(() =>
  data.data.value ? previewAllocation(data.data.value.transaction.amountCents, lines.value) : null,
)

async function save(useImplicit = false) {
  const current = data.data.value
  if (!current) return
  saveError.value = null
  saving.value = true
  try {
    const inputs = useImplicit ? [] : toAllocationInputs(lines.value)
    const explicit = await services.allocations.replaceAllocations(current.transaction.id, inputs)
    data.data.value = { transaction: current.transaction, explicit }
    toast.success(
      `Répartition enregistrée. Le montant payé reste ${formatCents(current.transaction.amountCents)} : seules les imputations ont changé.`,
    )
    void orgTotal.run()
  } catch (e) {
    saveError.value = toApiError(e)
  } finally {
    saving.value = false
  }
}

function retry() {
  void refData.load()
  void data.run()
  void orgTotal.run()
}
</script>

<template>
  <AsyncContent
    :loading="data.loading.value && !data.data.value"
    :error="data.error.value ?? refData.error.value"
    :error-title="
      data.error.value?.code === 'NOT_FOUND'
        ? 'Cette transaction est introuvable'
        : 'Impossible de charger la répartition'
    "
    skeleton="card"
    @retry="retry"
  >
    <div v-if="data.data.value && preview" class="stack" style="--stack-gap: var(--space-5)">
      <PageHeader
        title="Répartition analytique"
        :description="`${data.data.value.transaction.counterpartyName} · ${formatIsoDate(data.data.value.transaction.bookingDate)}`"
      >
        <template #breadcrumb>
          <RouterLink :to="{ name: RouteName.Allocations }">Allocations</RouterLink>
          <span aria-hidden="true"> / </span><span>{{ data.data.value.transaction.label }}</span>
        </template>
      </PageHeader>

      <BaseCard title="Dépense à répartir">
        <dl class="facts">
          <div>
            <dt>Payé par</dt>
            <dd data-testid="paid-by">
              {{ refData.entityName(data.data.value.transaction.entityId) }}
              <template v-if="data.data.value.transaction.cardId">
                — {{ refData.cardHolderName(data.data.value.transaction.cardId) }}, carte
                {{ refData.cardLabel(data.data.value.transaction.cardId) }}
              </template>
            </dd>
          </div>
          <div>
            <dt>Montant payé (à répartir)</dt>
            <dd class="amount tabular-nums" data-testid="amount-to-split">
              {{ formatCents(data.data.value.transaction.amountCents) }}
              <AiProvenanceBadge provenance="recorded" size="sm" />
            </dd>
          </div>
          <div>
            <dt>Libellé bancaire</dt>
            <dd>{{ data.data.value.transaction.label }}</dd>
          </div>
        </dl>
        <BaseAlert
          tone="info"
          title="Une seule dépense, plusieurs imputations"
          data-testid="single-spend-reminder"
        >
          Une seule dépense de {{ formatCents(data.data.value.transaction.amountCents) }} : la
          ventilation ne crée ni dépense supplémentaire ni écriture intersociétés. Le total
          consolidé reste {{ formatCents(data.data.value.transaction.amountCents) }}.
        </BaseAlert>
      </BaseCard>

      <BaseAlert v-if="!isDebit" tone="warning">
        Seuls les débits (dépenses) peuvent être répartis. Cette transaction est une entrée
        d'argent.
      </BaseAlert>

      <BaseCard
        v-else
        title="Imputé à"
        description="Saisissez des pourcentages : les montants sont calculés au centime près."
      >
        <div class="stack">
          <BaseAlert v-if="!canWrite" tone="info">
            Lecture seule : votre rôle ne permet pas de modifier les imputations.
          </BaseAlert>
          <p v-if="!isExplicit" class="text-secondary small">
            Aucune ventilation enregistrée : la dépense est imputée à 100 % à l'entité payeuse.
          </p>
          <AllocationEditor
            v-model:lines="lines"
            :amount-cents="data.data.value.transaction.amountCents"
            :entities="refData.entities.value"
            :cost-centers="refData.costCenters.value"
            :entity-name="refData.entityName"
            :readonly="!canWrite"
          />

          <BaseAlert
            v-if="saveError"
            tone="danger"
            title="La répartition n'a pas été enregistrée"
            live
            data-testid="allocation-error"
            :data-code="saveError.code"
          >
            {{ saveError.message }}
            <ul v-if="saveError.details.length">
              <li v-for="d in saveError.details" :key="d.field">{{ d.message }}</li>
            </ul>
            Votre saisie est conservée : corrigez les lignes puis enregistrez à nouveau.
          </BaseAlert>

          <div v-if="canWrite" class="actions">
            <BaseButton v-if="isExplicit" variant="ghost" :disabled="saving" @click="save(true)"
              >Revenir à 100 % sur l'entité payeuse</BaseButton
            >
            <BaseButton variant="secondary" :disabled="saving" @click="resetLines"
              >Annuler les modifications</BaseButton
            >
            <BaseButton
              icon="check"
              :loading="saving"
              :disabled="!!preview.blockingReason"
              :aria-describedby="preview.blockingReason ? 'blocking-reason' : undefined"
              data-testid="save-allocation"
              @click="save()"
              >Enregistrer la répartition</BaseButton
            >
          </div>
          <p
            v-if="canWrite && preview.blockingReason"
            id="blocking-reason"
            class="blocking"
            data-testid="blocking-reason"
          >
            {{ preview.blockingReason }}
          </p>
        </div>
      </BaseCard>

      <BaseCard
        title="Total des dépenses de l'organisation"
        description="Cumul depuis le 1er janvier, toutes entités."
      >
        <p class="org-total tabular-nums" data-testid="org-spend-total">
          {{ orgTotal.data.value ? formatCents(orgTotal.data.value.spend.imputedTotalCents) : '…' }}
        </p>
        <p class="small text-secondary">
          Ce total ne change pas quand vous modifiez la ventilation : imputé ou payé, la somme est
          la même.
        </p>
      </BaseCard>
    </div>
  </AsyncContent>
</template>

<style scoped>
.facts {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  margin: 0 0 var(--space-4);
}
.facts dt {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.facts dd {
  margin: var(--space-1) 0 0;
  font-weight: var(--font-weight-medium);
}
.amount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
@media (max-width: 479px) {
  .actions {
    flex-direction: column-reverse;
  }
}
.blocking {
  text-align: right;
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
  margin: 0;
}
.org-total {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-2);
}
.small {
  font-size: var(--font-size-sm);
}
</style>
