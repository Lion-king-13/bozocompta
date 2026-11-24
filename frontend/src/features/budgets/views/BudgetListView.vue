<script setup lang="ts">
/**
 * Budgets mensuels : consommé / restant / pourcentage (seuils 80 % et 100 %), filtres,
 * création, modification, suppression et détail des dépenses imputées.
 * Consommation calculée par le service (calcul unique sur l'imputé) : aucune somme ici.
 * Filtres conservés dans l'URL (`?mois=&entityId=&categorie=&centre=&budget=`).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseDialog,
  BaseSelect,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import { DEMO_CURRENT_MONTH } from '@/config/demo'
import { toApiError, type ApiError } from '@/core/errors'
import { formatBasisPoints, formatCents } from '@/core/money'
import type { Budget, BudgetStatus } from '@/domain'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncBlock from '@/features/dashboard/components/AsyncBlock.vue'
import { useReferenceLabels } from '@/features/dashboard/composables/useReferenceLabels'
import { BUDGET_LEVEL_BADGE, budgetLevel, consumedText, remainingText } from '../budgetLevel'
import BudgetDetailDialog from '../components/BudgetDetailDialog.vue'
import BudgetFormDialog from '../components/BudgetFormDialog.vue'
import { monthOptions } from '../months'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const services = useServices()
const labels = useReferenceLabels()
void labels.load()
const canManage = computed(() => auth.can('budgets:manage'))

// ── Filtres (dans l'URL) ──────────────────────────────────────────────────────────────────
const q = (key: string) =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : ''
const month = computed(() => q('mois') || DEMO_CURRENT_MONTH)
const entityId = computed(() => q('entityId') || scope.selectedEntityId || '')
const categoryId = computed(() => q('categorie'))
const costCenterId = computed(() => q('centre'))

function setFilter(key: string, value: string): void {
  void router.replace({ query: { ...route.query, [key]: value || undefined } })
}

const statuses = useAsync(
  () =>
    services.budgets.listBudgetStatuses({
      month: month.value,
      ...(entityId.value ? { entityId: entityId.value } : {}),
    }),
  { immediate: false },
)
watch([month, entityId], () => void statuses.run(), { immediate: true })

/** Filtrage d'affichage (catégorie, centre de coûts) d'une liste déjà calculée. */
const visible = computed<BudgetStatus[]>(() =>
  (statuses.data.value ?? []).filter(
    (s) =>
      (!categoryId.value || s.budget.categoryId === categoryId.value) &&
      (!costCenterId.value || s.budget.costCenterId === costCenterId.value),
  ),
)

const entityOptions = computed(() => [
  { value: '', label: 'Toutes les entités' },
  ...labels.entities.value.map((e) => ({ value: e.id, label: e.name })),
])
const categoryOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...labels.categories.value.map((c) => ({ value: c.id, label: c.name })),
])
const costCenterOptions = computed(() => [
  { value: '', label: 'Tous les centres de coûts' },
  ...labels.costCenters.value
    .filter((c) => !entityId.value || c.entityId === entityId.value)
    .map((c) => ({ value: c.id, label: labels.costCenter(c.id) })),
])

// ── Actions ───────────────────────────────────────────────────────────────────────────────
const toasts = useToasts()
const formOpen = ref(false)
const editing = ref<Budget | null>(null)
const toDelete = ref<Budget | null>(null)
const deleting = ref(false)
const deleteError = ref<ApiError | null>(null)

const detailId = computed(() => q('budget') || null)
const detailOpen = computed({
  get: () => detailId.value !== null,
  set: (value: boolean) => {
    if (!value) setFilter('budget', '')
  },
})

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(budget: Budget): void {
  editing.value = budget
  formOpen.value = true
}
function onSaved(budget: Budget, created: boolean): void {
  toasts.success(
    created ? `Budget « ${budget.label} » créé.` : `Budget « ${budget.label} » modifié.`,
  )
  if (budget.month !== month.value) setFilter('mois', budget.month)
  else void statuses.run()
}
async function confirmDelete(): Promise<void> {
  if (!toDelete.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await services.budgets.deleteBudget(toDelete.value.id)
    toasts.success(`Budget « ${toDelete.value.label} » supprimé.`)
    toDelete.value = null
    void statuses.run()
  } catch (e) {
    deleteError.value = toApiError(e)
  } finally {
    deleting.value = false
  }
}
const deleteOpen = computed({
  get: () => toDelete.value !== null,
  set: (v: boolean) => {
    if (!v) toDelete.value = null
  },
})

function scopeLabel(b: Budget): string {
  const parts = [labels.entity(b.entityId)]
  if (b.categoryId) parts.push(labels.category(b.categoryId))
  if (b.costCenterId) parts.push(labels.costCenter(b.costCenterId))
  return parts.join(' · ')
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="Budgets"
      description="Budgets mensuels par entité, catégorie ou centre de coûts, consommés sur les dépenses imputées. Seuil d’alerte à 80 %, dépassement au-delà de 100 %."
    >
      <template v-if="canManage" #actions>
        <BaseButton icon="plus" data-testid="budget-create" @click="openCreate">
          Créer un budget
        </BaseButton>
      </template>
    </PageHeader>

    <div class="filters" role="search" aria-label="Filtrer les budgets">
      <BaseSelect
        label="Mois"
        :model-value="month"
        :options="monthOptions()"
        @update:model-value="setFilter('mois', $event)"
      />
      <BaseSelect
        label="Entité"
        :model-value="entityId"
        :options="entityOptions"
        @update:model-value="setFilter('entityId', $event)"
      />
      <BaseSelect
        label="Catégorie"
        :model-value="categoryId"
        :options="categoryOptions"
        @update:model-value="setFilter('categorie', $event)"
      />
      <BaseSelect
        label="Centre de coûts"
        :model-value="costCenterId"
        :options="costCenterOptions"
        @update:model-value="setFilter('centre', $event)"
      />
    </div>

    <AsyncBlock
      :loading="statuses.loading.value"
      :error="statuses.error.value"
      :ready="!!statuses.data.value"
      skeleton="card"
      :rows="4"
      error-title="Impossible de charger les budgets"
      @retry="statuses.run"
    >
      <EmptyState
        v-if="visible.length === 0"
        icon="target"
        title="Aucun budget pour ces filtres"
        description="Créez un budget pour suivre la consommation, ou modifiez les filtres."
      >
        <template v-if="canManage" #actions>
          <BaseButton icon="plus" @click="openCreate">Créer un budget</BaseButton>
        </template>
      </EmptyState>
      <ul v-else class="budgets" data-testid="budget-list">
        <li
          v-for="s in visible"
          :key="s.budget.id"
          class="budget"
          :data-level="budgetLevel(s)"
          data-testid="budget-item"
        >
          <div class="budget__head">
            <div>
              <h2 class="budget__title">{{ s.budget.label }}</h2>
              <p class="budget__scope">{{ scopeLabel(s.budget) }}</p>
            </div>
            <StatusBadge
              :status="BUDGET_LEVEL_BADGE[budgetLevel(s)].status"
              :label="BUDGET_LEVEL_BADGE[budgetLevel(s)].label"
              size="sm"
            />
          </div>
          <ProgressBar
            :label="`Consommation de ${s.budget.label}`"
            hide-label
            :value="s.consumedCents"
            :max="s.budget.amountCents"
            :value-text="consumedText(s)"
          />
          <dl class="budget__figures">
            <div>
              <dt>Consommé</dt>
              <dd class="tabular-nums">{{ formatCents(s.consumedCents) }}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd class="tabular-nums">{{ formatCents(s.budget.amountCents) }}</dd>
            </div>
            <div>
              <dt>{{ s.remainingCents >= 0 ? 'Restant' : 'Dépassement' }}</dt>
              <dd class="tabular-nums" :class="{ 'is-over': s.remainingCents < 0 }">
                {{ formatCents(Math.abs(s.remainingCents)) }}
              </dd>
            </div>
            <div>
              <dt>Taux de consommation</dt>
              <dd class="tabular-nums">{{ formatBasisPoints(s.consumedBp) }}</dd>
            </div>
          </dl>
          <p class="sr-only">{{ remainingText(s) }}</p>
          <div class="budget__actions">
            <BaseButton
              size="sm"
              variant="secondary"
              icon="transactions"
              @click="setFilter('budget', s.budget.id)"
            >
              Voir les dépenses
            </BaseButton>
            <template v-if="canManage">
              <BaseButton size="sm" variant="ghost" icon="pencil" @click="openEdit(s.budget)">
                Modifier
              </BaseButton>
              <BaseButton size="sm" variant="ghost" icon="trash" @click="toDelete = s.budget">
                Supprimer
              </BaseButton>
            </template>
          </div>
        </li>
      </ul>
    </AsyncBlock>

    <BudgetFormDialog
      v-model:open="formOpen"
      :budget="editing"
      :default-month="month"
      :default-entity-id="entityId || null"
      :entities="labels.entities.value"
      :categories="labels.categories.value"
      :cost-centers="labels.costCenters.value"
      @saved="onSaved"
    />
    <BudgetDetailDialog v-model:open="detailOpen" :budget-id="detailId" :labels="labels" />
    <BaseDialog v-model:open="deleteOpen" title="Supprimer ce budget ?" alert size="sm">
      <p>Le budget « {{ toDelete?.label }} » sera supprimé. Les dépenses ne sont pas modifiées.</p>
      <BaseAlert v-if="deleteError" tone="danger" live>{{ deleteError.message }}</BaseAlert>
      <template #footer>
        <BaseButton variant="secondary" :disabled="deleting" @click="toDelete = null">
          Annuler
        </BaseButton>
        <BaseButton variant="danger" :loading="deleting" @click="confirmDelete">
          Supprimer le budget
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.page {
  min-width: 0;
}
.filters {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
  margin-bottom: var(--space-5);
}
@media (min-width: 640px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .filters {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.budgets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .budgets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.budget {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.budget[data-level='exceeded'] {
  border-left: 4px solid var(--color-danger-solid);
}
.budget[data-level='near'],
.budget[data-level='reached'] {
  border-left: 4px solid var(--color-warning-solid);
}
.budget__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.budget__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.budget__scope {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.budget__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2) var(--space-4);
  margin: 0;
  font-size: var(--font-size-sm);
}
@media (min-width: 480px) {
  .budget__figures {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.budget__figures dt {
  color: var(--color-text-secondary);
}
.budget__figures dd {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}
.is-over {
  color: var(--color-danger-text);
}
.budget__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
