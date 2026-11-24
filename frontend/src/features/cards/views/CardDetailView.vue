<script setup lang="ts">
/** Détail d'une carte : informations, plafond du mois et dépenses payées avec cette carte. */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseDialog,
  DataTable,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { Card } from '@/domain'
import { monthRange } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { CARD_STATUS_TO_UI, maskedCard } from '@/features/transactions/shared/labels'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import CardFormDialog from '../components/CardFormDialog.vue'

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const refData = useReferenceData()
void refData.load()

const cardId = computed(() => String(route.params.cardId))
const card = useAsync(() => services.cards.getCard(cardId.value))
const transactions = useAsync(() =>
  services.transactions.listTransactions({ cardId: cardId.value, pageSize: 200 }),
)
const monthSpend = useAsync(() =>
  services.dashboard.getSummary({ entityId: null, period: monthRange(DEMO_CURRENT_MONTH) }),
)
watch(cardId, () => {
  void card.run()
  void transactions.run()
})

const spentThisMonth = computed(
  () => monthSpend.data.value?.spend.byCard.find((b) => b.key === cardId.value)?.amountCents ?? 0,
)

const canManage = computed(() => auth.can('cards:manage'))
const editOpen = ref(false)
const confirmOpen = ref(false)
const busy = ref(false)
const actionError = shallowRef<ApiError | null>(null)
const feedback = ref('')

function onSaved(saved: Card) {
  card.data.value = saved
  feedback.value = 'Carte mise à jour.'
}

async function deactivate() {
  const current = card.data.value
  if (!current) return
  busy.value = true
  actionError.value = null
  try {
    const { id, ...rest } = current
    card.data.value = await services.cards.updateCard(id, { ...rest, status: 'blocked' })
    feedback.value =
      'Carte désactivée : elle ne peut plus être utilisée. Les dépenses passées restent comptées.'
    confirmOpen.value = false
  } catch (e) {
    actionError.value = toApiError(e)
  } finally {
    busy.value = false
  }
}

const columns: DataTableColumn[] = [
  { key: 'label', label: 'Libellé' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'category', label: 'Catégorie', hideOnMobile: true },
  { key: 'amount', label: 'Montant', numeric: true },
]

function retry() {
  void refData.load()
  void card.run()
  void transactions.run()
  void monthSpend.run()
}
</script>

<template>
  <AsyncContent
    :loading="card.loading.value && !card.data.value"
    :error="card.error.value ?? transactions.error.value ?? refData.error.value"
    :error-title="
      card.error.value?.code === 'NOT_FOUND'
        ? 'Cette carte est introuvable'
        : 'Impossible de charger la carte'
    "
    skeleton="card"
    @retry="retry"
  >
    <div v-if="card.data.value" class="stack" style="--stack-gap: var(--space-5)">
      <PageHeader
        :title="`Carte ${maskedCard(card.data.value.last4)}`"
        :description="card.data.value.label"
      >
        <template #breadcrumb>
          <RouterLink :to="{ name: RouteName.Cards }">Cartes</RouterLink>
          <span aria-hidden="true"> / </span><span>{{ maskedCard(card.data.value.last4) }}</span>
        </template>
        <template #meta>
          <StatusBadge v-bind="CARD_STATUS_TO_UI[card.data.value.status]" />
        </template>
        <template v-if="canManage" #actions>
          <BaseButton variant="secondary" icon="pencil" @click="editOpen = true"
            >Modifier</BaseButton
          >
          <BaseButton
            v-if="card.data.value.status === 'active'"
            variant="danger"
            icon="lock"
            @click="confirmOpen = true"
            >Désactiver</BaseButton
          >
        </template>
      </PageHeader>

      <BaseAlert v-if="feedback" tone="success" live dismissible @dismiss="feedback = ''">{{
        feedback
      }}</BaseAlert>

      <div class="grid">
        <BaseCard title="Informations">
          <dl class="facts">
            <div>
              <dt>Titulaire</dt>
              <dd>{{ refData.userName(card.data.value.holderUserId) }}</dd>
            </div>
            <div>
              <dt>Entité de la carte</dt>
              <dd>{{ refData.entityName(card.data.value.entityId) }}</dd>
            </div>
            <div>
              <dt>Numéro</dt>
              <dd>{{ maskedCard(card.data.value.last4) }} (fictif)</dd>
            </div>
            <div>
              <dt>Réseau</dt>
              <dd>{{ card.data.value.network === 'visa' ? 'Visa' : 'Mastercard' }}</dd>
            </div>
            <div>
              <dt>Expiration</dt>
              <dd>{{ card.data.value.expiresAt }}</dd>
            </div>
          </dl>
        </BaseCard>
        <BaseCard title="Plafond du mois">
          <ProgressBar
            label="Dépenses du mois"
            :value="spentThisMonth"
            :max="card.data.value.monthlyLimitCents"
            :value-text="`${formatCents(spentThisMonth)} sur ${formatCents(card.data.value.monthlyLimitCents)}`"
          />
        </BaseCard>
      </div>

      <BaseCard title="Dépenses payées avec cette carte" flush>
        <DataTable
          :columns="columns"
          :rows="transactions.data.value?.items ?? []"
          row-key="id"
          caption="Dépenses de la carte"
        >
          <template #cell-label="{ row }">
            <RouterLink
              :to="{ name: RouteName.TransactionDetail, params: { transactionId: row.id } }"
              >{{ row.label }}</RouterLink
            >
          </template>
          <template #cell-bookingDate="{ row }">{{ formatIsoDate(row.bookingDate) }}</template>
          <template #cell-category="{ row }">{{ refData.categoryName(row.categoryId) }}</template>
          <template #cell-amount="{ row }">{{ formatCents(row.amountCents) }}</template>
          <template #empty
            ><EmptyState compact icon="card" title="Aucune dépense avec cette carte"
          /></template>
        </DataTable>
      </BaseCard>

      <CardFormDialog
        v-model:open="editOpen"
        :card="card.data.value"
        :entities="refData.entities.value"
        :users="refData.users.value"
        :entity-name="refData.entityName"
        @saved="onSaved"
      />
      <BaseDialog
        v-model:open="confirmOpen"
        title="Désactiver cette carte ?"
        alert
        size="sm"
        :persistent="busy"
      >
        La carte {{ maskedCard(card.data.value.last4) }} ne pourra plus être utilisée. Les dépenses
        déjà payées restent comptées.
        <BaseAlert v-if="actionError" tone="danger" live>{{ actionError.message }}</BaseAlert>
        <template #footer>
          <BaseButton variant="secondary" :disabled="busy" @click="confirmOpen = false"
            >Annuler</BaseButton
          >
          <BaseButton variant="danger" :loading="busy" @click="deactivate"
            >Désactiver la carte</BaseButton
          >
        </template>
      </BaseDialog>
    </div>
  </AsyncContent>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
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
</style>
