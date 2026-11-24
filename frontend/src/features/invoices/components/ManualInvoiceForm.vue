<script setup lang="ts">
/**
 * Saisie MANUELLE d'une facture (QA-18) : sans IA et sans consommer de quota. Réutilise le
 * formulaire de correction ; aucune valeur ne porte de badge IA (tout est saisi à la main).
 * Enregistrée par `createInvoice` (statut « validée », provenance « validé »).
 */
import { ref, shallowRef } from 'vue'
import { BaseAlert, BaseButton, BaseCard } from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import type { Invoice, InvoiceInput } from '@/domain'
import { useServices } from '@/services'
import type { ReferenceData } from '@/features/transactions/shared/useReferenceData'
import {
  cloneForm,
  emptyFormOrigin,
  formToInput,
  isDuplicateConflict,
  serviceErrorsToForm,
  type FormErrors,
  type InvoiceForm,
} from '../invoiceForm'
import { useInvoiceOptions } from '../useInvoiceOptions'
import DuplicateInvoiceDialog from './DuplicateInvoiceDialog.vue'
import InvoiceFormFields from './InvoiceFormFields.vue'

const props = defineProps<{ entityId: string; refData: ReferenceData }>()
const emit = defineEmits<{ saved: [invoice: Invoice]; cancel: [] }>()

const services = useServices()
const options = useInvoiceOptions(props.refData)
const origin = emptyFormOrigin(props.entityId)
const form = ref<InvoiceForm>(cloneForm(origin.values))
const errors = ref<FormErrors>({})
const saving = ref(false)
const saveError = shallowRef<ApiError | null>(null)
const duplicateOpen = ref(false)
const duplicateMessage = ref('')
let pending: InvoiceInput | null = null

async function save(allowDuplicate = false) {
  saveError.value = null
  if (!allowDuplicate) {
    const { input, errors: formErrors } = formToInput(form.value)
    errors.value = formErrors
    pending = input
  }
  if (!pending) return
  saving.value = true
  try {
    const invoice = await services.invoices.createInvoice(pending, { allowDuplicate })
    duplicateOpen.value = false
    emit('saved', invoice)
  } catch (e) {
    const apiError = toApiError(e)
    if (isDuplicateConflict(apiError)) {
      duplicateMessage.value = apiError.details[0]?.message ?? apiError.message
      duplicateOpen.value = true
    } else {
      if (apiError.code === 'VALIDATION_ERROR') errors.value = serviceErrorsToForm(apiError.details)
      saveError.value = apiError
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseCard title="Saisie manuelle" data-testid="manual-invoice">
    <div class="stack" style="--stack-gap: var(--space-5)">
      <p class="text-secondary">
        Saisissez la facture à partir du document papier ou PDF. Cette saisie n'utilise pas l'IA et
        ne consomme aucun quota.
      </p>
      <InvoiceFormFields
        v-model:form="form"
        :origin="origin"
        :errors="errors"
        :supplier-options="options.supplierOptions.value"
        :entity-options="options.entityOptions.value"
        :category-options="options.categoryOptions.value"
      />
      <BaseAlert
        v-if="saveError"
        tone="danger"
        title="La facture n'a pas été enregistrée"
        live
        data-testid="manual-error"
        :data-code="saveError.code"
      >
        {{ saveError.message }} Votre saisie est conservée.
        <template #actions>
          <BaseButton size="sm" variant="secondary" icon="refresh" :loading="saving" @click="save()"
            >Réessayer</BaseButton
          >
        </template>
      </BaseAlert>
      <div class="form-actions">
        <BaseButton variant="secondary" @click="emit('cancel')">Annuler</BaseButton>
        <BaseButton icon="check" :loading="saving" data-testid="save-manual-invoice" @click="save()"
          >Enregistrer la facture</BaseButton
        >
      </div>
    </div>
    <DuplicateInvoiceDialog
      v-model:open="duplicateOpen"
      :message="duplicateMessage"
      :saving="saving"
      @confirm="save(true)"
    />
  </BaseCard>
</template>

<style scoped>
.form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
@media (max-width: 479px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions > * {
    width: 100%;
  }
}
</style>
