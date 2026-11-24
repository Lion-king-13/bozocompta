<script setup lang="ts">
/** Détail d'un collaborateur : rôle, entités, cartes et dépenses payées avec ses cartes. */
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  BaseCard,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { formatCents, sumCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { ROLE_LABELS } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { CARD_STATUS_TO_UI, maskedCard } from '@/features/transactions/shared/labels'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const refData = useReferenceData()
void refData.load()

const userId = computed(() => String(route.params.userId))
const data = useAsync(async () => {
  const [user, cards, transactions] = await Promise.all([
    services.users.getUser(userId.value),
    services.cards.listCards({ holderUserId: userId.value }),
    auth.can('transactions:read')
      ? services.transactions.listTransactions({
          holderUserId: userId.value,
          direction: 'debit',
          pageSize: 200,
        })
      : Promise.resolve(null),
  ])
  return { user, cards, transactions: transactions?.items ?? [] }
})
watch(userId, () => void data.run())

const total = computed(() =>
  sumCents((data.data.value?.transactions ?? []).map((t) => t.amountCents)),
)

const txColumns: DataTableColumn[] = [
  { key: 'label', label: 'Libellé' },
  { key: 'bookingDate', label: 'Date' },
  { key: 'card', label: 'Carte' },
  { key: 'entity', label: 'Payé par', hideOnMobile: true },
  { key: 'amount', label: 'Montant', numeric: true },
]

function retry() {
  void refData.load()
  void data.run()
}
</script>

<template>
  <AsyncContent
    :loading="data.loading.value && !data.data.value"
    :error="data.error.value ?? refData.error.value"
    :error-title="
      data.error.value?.code === 'NOT_FOUND'
        ? 'Ce collaborateur est introuvable'
        : 'Impossible de charger le collaborateur'
    "
    skeleton="card"
    @retry="retry"
  >
    <div v-if="data.data.value" class="stack" style="--stack-gap: var(--space-5)">
      <PageHeader
        :title="`${data.data.value.user.firstName} ${data.data.value.user.lastName}`"
        :description="`${data.data.value.user.jobTitle} · ${data.data.value.user.email}`"
      >
        <template #breadcrumb>
          <RouterLink :to="{ name: RouteName.Users }">Collaborateurs</RouterLink>
          <span aria-hidden="true"> / </span><span>{{ data.data.value.user.firstName }}</span>
        </template>
        <template #meta>
          <StatusBadge tone="info" :label="ROLE_LABELS[data.data.value.user.role]" icon="user" />
          <StatusBadge :status="data.data.value.user.active ? 'active' : 'inactive'" />
        </template>
      </PageHeader>

      <div class="grid">
        <BaseCard title="Entités">
          <ul class="plain">
            <li v-for="id in data.data.value.user.entityIds" :key="id">
              {{ refData.entityName(id) }}
            </li>
          </ul>
          <p class="small text-secondary">Un collaborateur peut appartenir à plusieurs entités.</p>
        </BaseCard>
        <BaseCard title="Cartes">
          <ul v-if="data.data.value.cards.length" class="plain">
            <li v-for="c in data.data.value.cards" :key="c.id">
              <RouterLink :to="{ name: RouteName.CardDetail, params: { cardId: c.id } }">{{
                maskedCard(c.last4)
              }}</RouterLink>
              — {{ refData.entityName(c.entityId) }}
              <StatusBadge v-bind="CARD_STATUS_TO_UI[c.status]" size="sm" />
            </li>
          </ul>
          <p v-else class="text-secondary">Aucune carte.</p>
        </BaseCard>
        <BaseCard title="Dépenses par carte">
          <p class="total tabular-nums">{{ formatCents(total) }}</p>
          <p class="small text-secondary">
            Somme des paiements par carte de ce collaborateur (toutes périodes).
          </p>
        </BaseCard>
      </div>

      <BaseCard title="Dépenses payées par ce collaborateur" flush>
        <DataTable
          :columns="txColumns"
          :rows="data.data.value.transactions"
          row-key="id"
          caption="Dépenses du collaborateur"
        >
          <template #cell-label="{ row }">
            <RouterLink
              :to="{ name: RouteName.TransactionDetail, params: { transactionId: row.id } }"
              >{{ row.label }}</RouterLink
            >
          </template>
          <template #cell-bookingDate="{ row }">{{ formatIsoDate(row.bookingDate) }}</template>
          <template #cell-card="{ row }">{{ refData.cardLabel(row.cardId) }}</template>
          <template #cell-entity="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-amount="{ row }">{{ formatCents(row.amountCents) }}</template>
          <template #empty><EmptyState compact title="Aucune dépense par carte" /></template>
        </DataTable>
      </BaseCard>
    </div>
  </AsyncContent>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  align-items: start;
}
.plain {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.small {
  font-size: var(--font-size-sm);
}
.total {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-2);
}
</style>
