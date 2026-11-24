<script setup lang="ts">
/**
 * Centres de coûts : un modèle unique (arbitrage D3), de type département ou projet,
 * rattaché à UNE entité. Ajouter, modifier, désactiver (un centre utilisé reste dans
 * l'historique ; désactivé, il n'est plus proposé dans les nouvelles imputations).
 */
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseDialog,
  BaseSelect,
  BaseTextField,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { COST_CENTER_TYPE_LABELS, type CostCenter, type CostCenterType } from '@/domain'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import FilterBar from '@/features/transactions/shared/FilterBar.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

const typeFilter = ref<CostCenterType | ''>('')
const list = useAsync(() =>
  services.costCenters.listCostCenters({
    entityId: scope.selectedEntityId ?? undefined,
    type: typeFilter.value || undefined,
  }),
)
const summary = useAsync(() => services.dashboard.getSummary({ entityId: null }))
watch([typeFilter, () => scope.selectedEntityId], () => void list.run())

function spendOf(id: string): number {
  return summary.data.value?.spend.byCostCenter.find((b) => b.key === id)?.amountCents ?? 0
}

const canManage = computed(() => auth.can('cost-centers:manage'))
const typeOptions = [
  { value: 'department', label: COST_CENTER_TYPE_LABELS.department },
  { value: 'project', label: COST_CENTER_TYPE_LABELS.project },
]
const entityOptions = computed(() =>
  refData.entities.value.map((e) => ({ value: e.id, label: refData.entityName(e.id) })),
)

const dialogOpen = ref(false)
const editing = ref<CostCenter | null>(null)
const form = reactive({
  code: '',
  name: '',
  type: 'department' as CostCenterType,
  entityId: '',
  active: true,
})
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const feedback = ref('')
const actionError = shallowRef<ApiError | null>(null)

function openDialog(cc: CostCenter | null) {
  editing.value = cc
  Object.assign(form, {
    code: cc?.code ?? '',
    name: cc?.name ?? '',
    type: cc?.type ?? 'department',
    entityId: cc?.entityId ?? scope.selectedEntityId ?? refData.entities.value[0]?.id ?? '',
    active: cc?.active ?? true,
  })
  errors.value = {}
  actionError.value = null
  dialogOpen.value = true
}

async function persist(id: string | null, input: Omit<CostCenter, 'id'>) {
  const saved = id
    ? await services.costCenters.updateCostCenter(id, input)
    : await services.costCenters.createCostCenter(input)
  void list.run()
  return saved
}

async function save() {
  const e: Record<string, string> = {}
  if (!form.code.trim()) e.code = 'Le code est requis.'
  if (!form.name.trim()) e.name = 'Le nom est requis.'
  if (!form.entityId) e.entityId = "Choisissez l'entité de rattachement."
  errors.value = e
  if (Object.keys(e).length) return
  saving.value = true
  actionError.value = null
  try {
    const saved = await persist(editing.value?.id ?? null, {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      entityId: form.entityId,
      active: form.active,
    })
    feedback.value = `Centre de coûts « ${saved.name} » enregistré.`
    dialogOpen.value = false
  } catch (err) {
    actionError.value = toApiError(err)
  } finally {
    saving.value = false
  }
}

async function toggleActive(cc: CostCenter) {
  actionError.value = null
  try {
    const { id, ...rest } = cc
    const saved = await persist(id, { ...rest, active: !cc.active })
    feedback.value = `« ${saved.name} » ${saved.active ? 'réactivé' : 'désactivé'}.`
  } catch (err) {
    actionError.value = toApiError(err)
  }
}

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Centre de coûts' },
  { key: 'code', label: 'Code', hideOnMobile: true },
  { key: 'type', label: 'Type' },
  { key: 'entity', label: 'Entité' },
  { key: 'status', label: 'Statut' },
  { key: 'spend', label: 'Imputé (année)', numeric: true },
  { key: 'actions', label: 'Actions' },
]

function retry() {
  void refData.load()
  void list.run()
  void summary.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Centres de coûts"
      description="Départements et projets, chacun rattaché à une entité. Ils servent de cible aux imputations analytiques."
    >
      <template #actions>
        <BaseButton v-if="canManage" icon="plus" @click="openDialog(null)"
          >Ajouter un centre de coûts</BaseButton
        >
      </template>
    </PageHeader>

    <BaseAlert v-if="feedback" tone="success" live dismissible @dismiss="feedback = ''">{{
      feedback
    }}</BaseAlert>
    <BaseAlert v-if="actionError && !dialogOpen" tone="danger" live :data-code="actionError.code">{{
      actionError.message
    }}</BaseAlert>

    <FilterBar :active-count="typeFilter ? 1 : 0" @clear="typeFilter = ''">
      <BaseSelect
        v-model="typeFilter"
        label="Type"
        :options="[{ value: '', label: 'Départements et projets' }, ...typeOptions]"
      />
    </FilterBar>

    <AsyncContent
      :loading="list.loading.value && !list.data.value"
      :error="list.error.value ?? refData.error.value"
      error-title="Impossible de charger les centres de coûts"
      @retry="retry"
    >
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="list.data.value ?? []"
          row-key="id"
          caption="Centres de coûts"
        >
          <template #cell-type="{ row }">{{
            COST_CENTER_TYPE_LABELS[row.type as CostCenterType]
          }}</template>
          <template #cell-entity="{ row }">{{ refData.entityName(row.entityId) }}</template>
          <template #cell-status="{ row }"
            ><StatusBadge :status="row.active ? 'active' : 'inactive'" size="sm"
          /></template>
          <template #cell-spend="{ row }">{{ formatCents(spendOf(row.id)) }}</template>
          <template #cell-actions="{ row }">
            <div v-if="canManage" class="row-actions">
              <BaseButton variant="ghost" size="sm" icon="pencil" @click="openDialog(row)"
                >Modifier</BaseButton
              >
              <BaseButton variant="ghost" size="sm" @click="toggleActive(row)">{{
                row.active ? 'Désactiver' : 'Réactiver'
              }}</BaseButton>
            </div>
            <span v-else class="text-secondary">—</span>
          </template>
          <template #empty
            ><EmptyState compact icon="target" title="Aucun centre de coûts"
          /></template>
        </DataTable>
      </BaseCard>
    </AsyncContent>

    <BaseDialog
      v-model:open="dialogOpen"
      :title="editing ? 'Modifier le centre de coûts' : 'Ajouter un centre de coûts'"
      size="sm"
      :persistent="saving"
    >
      <div class="stack">
        <BaseTextField v-model="form.name" label="Nom" required :error="errors.name" />
        <BaseTextField
          v-model="form.code"
          label="Code"
          required
          :error="errors.code"
          hint="Ex. BE-IT, FR-PARIS."
        />
        <BaseSelect v-model="form.type" label="Type" :options="typeOptions" />
        <BaseSelect
          v-model="form.entityId"
          label="Entité de rattachement"
          :options="entityOptions"
          required
          :error="errors.entityId"
        />
        <BaseAlert v-if="actionError" tone="danger" live>{{ actionError.message }}</BaseAlert>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="saving" @click="dialogOpen = false"
          >Annuler</BaseButton
        >
        <BaseButton icon="check" :loading="saving" @click="save">Enregistrer</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
</style>
