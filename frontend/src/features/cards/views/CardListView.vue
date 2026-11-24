<script setup lang="ts">
/**
 * Cartes de paiement : une carte appartient à UNE entité ; un collaborateur peut en avoir
 * plusieurs (y compris sur des entités différentes). Seuls les 4 derniers chiffres (fictifs)
 * sont affichés. Dépenses du mois issues du calcul unique (SpendReport).
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
  ProgressBar,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import type { Card } from '@/domain'
import { monthRange } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import FilterBar from '@/features/transactions/shared/FilterBar.vue'
import { CARD_STATUS_TO_UI, maskedCard } from '@/features/transactions/shared/labels'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import CardFormDialog from '../components/CardFormDialog.vue'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

const entityFilter = ref('')
const holderFilter = ref('')

const cards = useAsync(() =>
  services.cards.listCards({
    entityId: entityFilter.value || scope.selectedEntityId || undefined,
    holderUserId: holderFilter.value || undefined,
  }),
)
/** Dépenses du mois par carte (même calcul que les tableaux de bord). */
const monthSpend = useAsync(() =>
  services.dashboard.getSummary({ entityId: null, period: monthRange(DEMO_CURRENT_MONTH) }),
)
watch([entityFilter, holderFilter, () => scope.selectedEntityId], () => void cards.run())

function spentThisMonth(cardId: string): number {
  return monthSpend.data.value?.spend.byCard.find((b) => b.key === cardId)?.amountCents ?? 0
}

const entityOptions = computed(() => [
  { value: '', label: scope.selectedEntityId ? 'Périmètre sélectionné' : 'Toutes les entités' },
  ...refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
])
const holderOptions = computed(() => [
  { value: '', label: 'Tous les titulaires' },
  ...refData.users.value.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
])
const activeCount = computed(() => [entityFilter.value, holderFilter.value].filter(Boolean).length)
function clearFilters() {
  entityFilter.value = ''
  holderFilter.value = ''
}

const canManage = computed(() => auth.can('cards:manage'))
const dialogOpen = ref(false)
const editing = ref<Card | null>(null)
const toast = useToasts()

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}
function openEdit(card: Card) {
  editing.value = card
  dialogOpen.value = true
}
function onSaved(card: Card) {
  toast.success(`Carte ${maskedCard(card.last4)} enregistrée.`)
  void cards.run()
}

const columns: DataTableColumn[] = [
  { key: 'label', label: 'Carte' },
  { key: 'holder', label: 'Titulaire' },
  { key: 'entity', label: 'Entité' },
  { key: 'limit', label: 'Dépenses du mois / plafond' },
  { key: 'status', label: 'Statut' },
  { key: 'actions', label: 'Actions', hideOnMobile: false },
]

function retry() {
  void refData.load()
  void cards.run()
  void monthSpend.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Cartes"
      description="Cartes d'entreprise fictives : seuls les 4 derniers chiffres sont connus. Chaque carte appartient à une entité."
    >
      <template #actions>
        <BaseButton v-if="canManage" icon="plus" data-testid="add-card" @click="openCreate"
          >Ajouter une carte</BaseButton
        >
      </template>
    </PageHeader>

    <FilterBar :active-count="activeCount" @clear="clearFilters">
      <BaseSelect v-model="entityFilter" label="Entité" :options="entityOptions" />
      <BaseSelect
        v-if="refData.users.value.length"
        v-model="holderFilter"
        label="Titulaire"
        :options="holderOptions"
      />
    </FilterBar>

    <AsyncContent
      :loading="cards.loading.value && !cards.data.value"
      :error="cards.error.value ?? refData.error.value"
      error-title="Impossible de charger les cartes"
      @retry="retry"
    >
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="cards.data.value ?? []"
          row-key="id"
          caption="Cartes de paiement"
        >
          <template #cell-label="{ row }">
            <RouterLink :to="{ name: RouteName.CardDetail, params: { cardId: row.id } }">{{
              maskedCard(row.last4)
            }}</RouterLink>
            <span class="text-secondary card-label">{{ row.label }}</span>
          </template>
          <template #cell-holder="{ row }">{{ refData.userName(row.holderUserId) }}</template>
          <template #cell-entity="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-limit="{ row }">
            <ProgressBar
              :label="`Dépenses du mois, carte ${maskedCard(row.last4)}`"
              hide-label
              :value="spentThisMonth(row.id)"
              :max="row.monthlyLimitCents"
              :value-text="`${formatCents(spentThisMonth(row.id))} sur ${formatCents(row.monthlyLimitCents)}`"
            />
          </template>
          <template #cell-status="{ row }">
            <StatusBadge v-bind="CARD_STATUS_TO_UI[row.status]" size="sm" />
          </template>
          <template #cell-actions="{ row }">
            <BaseButton
              v-if="canManage"
              variant="ghost"
              size="sm"
              icon="pencil"
              @click="openEdit(row)"
              >Modifier</BaseButton
            >
            <RouterLink v-else :to="{ name: RouteName.CardDetail, params: { cardId: row.id } }"
              >Voir</RouterLink
            >
          </template>
          <template #empty>
            <EmptyState compact icon="card" title="Aucune carte enregistrée" />
          </template>
        </DataTable>
      </BaseCard>
    </AsyncContent>

    <CardFormDialog
      v-model:open="dialogOpen"
      :card="editing"
      :entities="refData.entities.value"
      :users="refData.users.value"
      :entity-name="refData.entityName"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.card-label {
  display: block;
  font-size: var(--font-size-xs);
}
</style>
