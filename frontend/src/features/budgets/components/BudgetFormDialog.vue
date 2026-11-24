<script setup lang="ts">
/**
 * Création / modification d'un budget mensuel. Le montant est saisi en euros et converti en
 * centimes par `parseAmountToCents` (jamais de calcul en flottant). Les erreurs de validation
 * renvoyées par le service sont affichées sous le champ concerné ; le formulaire est conservé.
 */
import { computed, reactive, ref, watch } from 'vue'
import { BaseAlert, BaseButton, BaseDialog, BaseSelect, BaseTextField } from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents, parseAmountToCents } from '@/core/money'
import type { Budget, BudgetInput, Category, CostCenter, LegalEntity } from '@/domain'
import { COST_CENTER_TYPE_LABELS } from '@/domain'
import { useServices } from '@/services'
import { monthOptions } from '../months'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** Budget à modifier ; `null` = création. */
  budget: Budget | null
  defaultMonth: string
  defaultEntityId: string | null
  entities: LegalEntity[]
  categories: Category[]
  costCenters: CostCenter[]
}>()
const emit = defineEmits<{ saved: [budget: Budget, created: boolean] }>()

const form = reactive({
  label: '',
  entityId: '',
  categoryId: '',
  costCenterId: '',
  month: '',
  amount: '',
})
const errors = reactive<Record<string, string | undefined>>({})
const failure = ref<ApiError | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const b = props.budget
  form.label = b?.label ?? ''
  form.entityId = b?.entityId ?? props.defaultEntityId ?? props.entities[0]?.id ?? ''
  form.categoryId = b?.categoryId ?? ''
  form.costCenterId = b?.costCenterId ?? ''
  form.month = b?.month ?? props.defaultMonth
  // Valeur d'édition « 1500,00 » : formatCents sans symbole ni séparateur de milliers.
  form.amount = b ? formatCents(b.amountCents).replace(/[^\d,]/g, '') : ''
  Object.keys(errors).forEach((k) => (errors[k] = undefined))
  failure.value = null
})

const entityOptions = computed(() => props.entities.map((e) => ({ value: e.id, label: e.name })))
const categoryOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...props.categories.map((c) => ({ value: c.id, label: c.name })),
])
const costCenterOptions = computed(() => [
  { value: '', label: 'Tous les centres de coûts' },
  ...props.costCenters
    .filter((c) => c.entityId === form.entityId)
    .map((c) => ({ value: c.id, label: `${COST_CENTER_TYPE_LABELS[c.type]} · ${c.name}` })),
])
watch(
  () => form.entityId,
  () => {
    if (!costCenterOptions.value.some((o) => o.value === form.costCenterId)) form.costCenterId = ''
  },
)

async function submit(): Promise<void> {
  Object.keys(errors).forEach((k) => (errors[k] = undefined))
  failure.value = null
  const amountCents = parseAmountToCents(form.amount)
  if (!form.label.trim()) errors.label = 'Le libellé est requis.'
  if (amountCents === null || amountCents <= 0)
    errors.amountCents = 'Saisissez un montant positif, par exemple 1 500,00.'
  if (errors.label || errors.amountCents) return

  const input: BudgetInput = {
    label: form.label,
    entityId: form.entityId,
    categoryId: form.categoryId || null,
    costCenterId: form.costCenterId || null,
    month: form.month,
    amountCents: amountCents as number,
  }
  saving.value = true
  try {
    const budgets = useServices().budgets
    const saved = props.budget
      ? await budgets.updateBudget(props.budget.id, input)
      : await budgets.createBudget(input)
    emit('saved', saved, !props.budget)
    open.value = false
  } catch (e) {
    const error = toApiError(e)
    error.details.forEach((d) => (errors[d.field] = d.message))
    failure.value = error
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="budget ? 'Modifier le budget' : 'Créer un budget'"
    description="Budget mensuel d’une entité, éventuellement limité à une catégorie et/ou un centre de coûts. Consommé sur les dépenses imputées."
    :persistent="saving"
  >
    <form id="budget-form" class="budget-form" novalidate @submit.prevent="submit">
      <BaseAlert v-if="failure && !failure.details.length" tone="danger" live>
        {{ failure.message }}
      </BaseAlert>
      <BaseTextField v-model="form.label" label="Libellé" required :error="errors.label" />
      <BaseSelect v-model="form.entityId" label="Entité" :options="entityOptions" required />
      <BaseSelect
        v-model="form.categoryId"
        label="Catégorie"
        :options="categoryOptions"
        :error="errors.categoryId"
      />
      <BaseSelect
        v-model="form.costCenterId"
        label="Centre de coûts"
        :options="costCenterOptions"
        :error="errors.costCenterId"
      />
      <BaseSelect
        v-model="form.month"
        label="Mois"
        :options="monthOptions()"
        required
        :error="errors.month"
      />
      <BaseTextField
        v-model="form.amount"
        label="Montant du budget"
        inputmode="decimal"
        suffix="€"
        required
        :error="errors.amountCents"
        hint="Montant TTC pour le mois."
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Annuler</BaseButton>
      <BaseButton type="submit" form="budget-form" :loading="saving">
        {{ budget ? 'Enregistrer les modifications' : 'Créer le budget' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped>
.budget-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
