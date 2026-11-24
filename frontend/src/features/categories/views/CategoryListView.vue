<script setup lang="ts">
/**
 * Catégories de dépenses (communes à l'organisation) : ajouter, renommer, supprimer si
 * inutilisée. Les dépenses par catégorie viennent du calcul unique (SpendReport).
 */
import { computed, reactive, ref, shallowRef } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseDialog,
  BaseTextField,
  DataTable,
  EmptyState,
  PageHeader,
  type DataTableColumn,
} from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import type { Category } from '@/domain'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'

const services = useServices()
const auth = useAuthStore()
const categories = useAsync(() => services.categories.listCategories())
const summary = useAsync(() => services.dashboard.getSummary({ entityId: null }))

const canManage = computed(() => auth.can('categories:manage'))
function spendOf(id: string): number {
  return summary.data.value?.spend.byCategory.find((b) => b.key === id)?.amountCents ?? 0
}

const dialogOpen = ref(false)
const editing = ref<Category | null>(null)
const form = reactive({ code: '', name: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const toast = useToasts()
const actionError = shallowRef<ApiError | null>(null)

function openDialog(category: Category | null) {
  editing.value = category
  form.code = category?.code ?? ''
  form.name = category?.name ?? ''
  errors.value = {}
  actionError.value = null
  dialogOpen.value = true
}

async function save() {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Le nom est requis.'
  if (!/^[A-Z0-9_-]{2,20}$/.test(form.code)) e.code = '2 à 20 caractères : A-Z, 0-9, _ ou -.'
  errors.value = e
  if (Object.keys(e).length) return
  saving.value = true
  actionError.value = null
  try {
    const input = { code: form.code, name: form.name.trim() }
    const saved = editing.value
      ? await services.categories.updateCategory(editing.value.id, input)
      : await services.categories.createCategory(input)
    toast.success(`Catégorie « ${saved.name} » enregistrée.`)
    dialogOpen.value = false
    void categories.run()
  } catch (err) {
    actionError.value = toApiError(err)
    for (const d of actionError.value.details) errors.value[d.field] = d.message
  } finally {
    saving.value = false
  }
}

async function remove(category: Category) {
  actionError.value = null
  try {
    await services.categories.deleteCategory(category.id)
    toast.success(`Catégorie « ${category.name} » supprimée.`)
    void categories.run()
  } catch (err) {
    actionError.value = toApiError(err)
  }
}

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Catégorie' },
  { key: 'code', label: 'Code' },
  { key: 'spend', label: 'Dépenses imputées (année)', numeric: true },
  { key: 'actions', label: 'Actions' },
]

function retry() {
  void categories.run()
  void summary.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Catégories"
      description="Natures de dépenses communes à toutes les entités de l'organisation."
    >
      <template #actions>
        <BaseButton v-if="canManage" icon="plus" @click="openDialog(null)"
          >Ajouter une catégorie</BaseButton
        >
      </template>
    </PageHeader>
    <BaseAlert v-if="actionError && !dialogOpen" tone="danger" live :data-code="actionError.code">{{
      actionError.message
    }}</BaseAlert>

    <AsyncContent
      :loading="categories.loading.value && !categories.data.value"
      :error="categories.error.value"
      error-title="Impossible de charger les catégories"
      @retry="retry"
    >
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="categories.data.value ?? []"
          row-key="id"
          caption="Catégories de dépenses"
        >
          <template #cell-spend="{ row }">{{ formatCents(spendOf(row.id)) }}</template>
          <template #cell-actions="{ row }">
            <div v-if="canManage" class="row-actions">
              <BaseButton variant="ghost" size="sm" icon="pencil" @click="openDialog(row)"
                >Renommer</BaseButton
              >
              <BaseButton variant="ghost" size="sm" icon="trash" @click="remove(row)"
                >Supprimer</BaseButton
              >
            </div>
            <span v-else class="text-secondary">—</span>
          </template>
          <template #empty><EmptyState compact icon="tag" title="Aucune catégorie" /></template>
        </DataTable>
      </BaseCard>
      <p class="text-secondary small">
        Une catégorie déjà utilisée (facture, transaction ou budget) ne peut pas être supprimée.
      </p>
    </AsyncContent>

    <BaseDialog
      v-model:open="dialogOpen"
      :title="editing ? 'Modifier la catégorie' : 'Ajouter une catégorie'"
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
          hint="Ex. TRAVEL, SOFTWARE."
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
.small {
  font-size: var(--font-size-sm);
}
</style>
