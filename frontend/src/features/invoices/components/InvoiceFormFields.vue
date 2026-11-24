<script setup lang="ts">
/**
 * Champs d'une facture (en-tête + lignes + totaux recalculés), avec la provenance de chaque
 * valeur. Utilisé par l'écran d'import (brouillon extrait) et par le détail d'une facture.
 * Le formulaire est un v-model : le parent garde l'état et décide quoi enregistrer.
 */
import { computed } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseSelect,
  BaseTextField,
  type SelectOption,
} from '@/components/ui'
import { formatIsoDate, isIsoDate } from '@/core/dates/dates'
import { formatCents } from '@/core/money'
import {
  computeFormTotals,
  emptyLine,
  fieldProvenance,
  type FormErrors,
  type InvoiceFieldKey,
  type InvoiceForm,
  type InvoiceFormOrigin,
} from '../invoiceForm'
import ProvenanceMeta from './ProvenanceMeta.vue'

const form = defineModel<InvoiceForm>('form', { required: true })

const props = withDefaults(
  defineProps<{
    origin: InvoiceFormOrigin
    errors?: FormErrors
    readonly?: boolean
    supplierOptions: SelectOption[]
    entityOptions: SelectOption[]
    categoryOptions: SelectOption[]
    /** Nom du fournisseur tel que lu dans le document. */
    extractedSupplierName?: string | null
    /** « Valeur extraite » (brouillon) ou « Valeur enregistrée » (facture existante). */
    originalLabel?: string
  }>(),
  { errors: () => ({}), extractedSupplierName: null, originalLabel: 'Valeur extraite' },
)

const totals = computed(() => computeFormTotals(form.value))
const totalMismatch = computed(
  () =>
    props.origin.extractedTotalCents !== null &&
    totals.value.totalInclVatCents !== props.origin.extractedTotalCents,
)

function provenance(key: InvoiceFieldKey) {
  return fieldProvenance(form.value, props.origin, key)
}

/** Teinte du champ : indigo si encore « IA », prune si corrigé. */
function tint(key: InvoiceFieldKey): 'extracted' | 'corrected' | undefined {
  const p = provenance(key)
  if (p === 'ai_extracted' || p === 'ai_suggested') return 'extracted'
  if (p === 'user_corrected') return 'corrected'
  return undefined
}

function optionLabel(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? ''
}

function originalText(key: InvoiceFieldKey): string {
  const value = props.origin.values[key]
  if (key === 'supplierId') return optionLabel(props.supplierOptions, value as string)
  if (key === 'entityId') return optionLabel(props.entityOptions, value as string)
  if (key === 'categoryId') return optionLabel(props.categoryOptions, value as string)
  if ((key === 'issueDate' || key === 'dueDate') && isIsoDate(value as string))
    return formatIsoDate(value as string)
  if (key === 'lines') return `${props.origin.values.lines.length} ligne(s)`
  return String(value)
}

function revert(key: InvoiceFieldKey) {
  if (key === 'lines') form.value.lines = props.origin.values.lines.map((l) => ({ ...l }))
  else form.value[key] = props.origin.values[key] as string
}

function addLine() {
  form.value.lines.push(emptyLine(form.value.lines[0]?.vatRate ?? '21'))
}

function removeLine(index: number) {
  form.value.lines.splice(index, 1)
}
</script>

<template>
  <div class="invoice-form">
    <fieldset class="invoice-form__group">
      <legend class="invoice-form__legend">En-tête de la facture</legend>
      <div class="invoice-form__grid">
        <div>
          <BaseSelect
            v-model="form.supplierId"
            label="Fournisseur"
            :options="supplierOptions"
            placeholder="Choisir un fournisseur"
            required
            :disabled="readonly"
            :error="errors.supplierId"
            :hint="
              extractedSupplierName
                ? `Nom lu dans le document : ${extractedSupplierName}`
                : undefined
            "
          />
          <ProvenanceMeta
            :provenance="provenance('supplierId')"
            :original-text="originalText('supplierId')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('supplierId')"
          />
        </div>
        <div>
          <BaseTextField
            v-model="form.number"
            label="N° de facture"
            required
            :readonly="readonly"
            :error="errors.number"
            :tint="tint('number')"
          />
          <ProvenanceMeta
            :provenance="provenance('number')"
            :original-text="originalText('number')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('number')"
          />
        </div>
        <div>
          <BaseTextField
            v-model="form.issueDate"
            type="date"
            label="Date d'émission"
            required
            :readonly="readonly"
            :error="errors.issueDate"
            :tint="tint('issueDate')"
          />
          <ProvenanceMeta
            :provenance="provenance('issueDate')"
            :original-text="originalText('issueDate')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('issueDate')"
          />
        </div>
        <div>
          <BaseTextField
            v-model="form.dueDate"
            type="date"
            label="Date d'échéance"
            required
            :readonly="readonly"
            :error="errors.dueDate"
            :tint="tint('dueDate')"
          />
          <ProvenanceMeta
            :provenance="provenance('dueDate')"
            :original-text="originalText('dueDate')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('dueDate')"
          />
        </div>
        <div>
          <BaseSelect
            v-model="form.entityId"
            label="Entité destinataire"
            :options="entityOptions"
            placeholder="Choisir une entité"
            required
            :disabled="readonly"
            :error="errors.entityId"
            hint="Société qui reçoit et paie la facture."
          />
          <ProvenanceMeta
            :provenance="provenance('entityId')"
            :original-text="originalText('entityId')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('entityId')"
          />
        </div>
        <div>
          <BaseSelect
            v-model="form.categoryId"
            label="Catégorie"
            :options="[{ value: '', label: 'Non catégorisée' }, ...categoryOptions]"
            :disabled="readonly"
            :error="errors.categoryId"
          />
          <ProvenanceMeta
            :provenance="provenance('categoryId')"
            :original-text="originalText('categoryId')"
            :original-label="originalLabel"
            :readonly="readonly"
            @revert="revert('categoryId')"
          />
        </div>
      </div>
    </fieldset>

    <fieldset class="invoice-form__group">
      <legend class="invoice-form__legend">Lignes de la facture</legend>
      <ProvenanceMeta
        :provenance="provenance('lines')"
        :original-text="originalText('lines')"
        :original-label="originalLabel"
        :readonly="readonly"
        @revert="revert('lines')"
      />
      <p v-if="errors.lines" class="invoice-form__error" role="alert">{{ errors.lines }}</p>
      <ol class="invoice-form__lines">
        <li
          v-for="(line, index) in form.lines"
          :key="index"
          class="invoice-form__line"
          data-testid="invoice-line"
        >
          <BaseTextField
            v-model="line.description"
            class="invoice-form__desc"
            :label="`Description (ligne ${index + 1})`"
            required
            :readonly="readonly"
            :error="errors[`lines.${index}.description`]"
            :tint="tint('lines')"
          />
          <BaseTextField
            v-model="line.quantity"
            label="Quantité"
            inputmode="numeric"
            :readonly="readonly"
            :error="errors[`lines.${index}.quantity`]"
            :tint="tint('lines')"
          />
          <BaseTextField
            v-model="line.unitPrice"
            label="Prix unitaire HT"
            inputmode="decimal"
            suffix="€"
            :readonly="readonly"
            :error="errors[`lines.${index}.unitPrice`]"
            :tint="tint('lines')"
          />
          <BaseTextField
            v-model="line.vatRate"
            label="TVA"
            inputmode="decimal"
            suffix="%"
            :readonly="readonly"
            :error="errors[`lines.${index}.vatRate`]"
            :tint="tint('lines')"
          />
          <div v-if="!readonly && form.lines.length > 1" class="invoice-form__remove">
            <BaseButton
              variant="ghost"
              size="sm"
              icon="trash"
              :aria-label="`Supprimer la ligne ${index + 1}`"
              @click="removeLine(index)"
              >Supprimer</BaseButton
            >
          </div>
        </li>
      </ol>
      <BaseButton v-if="!readonly" variant="secondary" size="sm" icon="plus" @click="addLine"
        >Ajouter une ligne</BaseButton
      >
    </fieldset>

    <section class="invoice-form__totals" aria-labelledby="totals-title">
      <h3 id="totals-title" class="invoice-form__legend">Totaux recalculés à partir des lignes</h3>
      <dl class="totals">
        <div>
          <dt>Total HT</dt>
          <dd class="tabular-nums" data-testid="total-excl">
            {{ formatCents(totals.totalExclVatCents) }}
          </dd>
        </div>
        <div>
          <dt>TVA</dt>
          <dd class="tabular-nums" data-testid="total-vat">{{ formatCents(totals.vatCents) }}</dd>
        </div>
        <div class="totals__main">
          <dt>Total TTC</dt>
          <dd class="tabular-nums" data-testid="total-incl">
            {{ formatCents(totals.totalInclVatCents) }}
          </dd>
        </div>
      </dl>
      <BaseAlert
        v-if="totalMismatch && origin.extractedTotalCents !== null"
        tone="warning"
        title="Totaux à vérifier"
      >
        Le total des lignes ({{ formatCents(totals.totalInclVatCents) }}) diffère du total lu dans
        le document ({{ formatCents(origin.extractedTotalCents) }}). Vérifiez les lignes.
      </BaseAlert>
    </section>
  </div>
</template>

<style scoped>
.invoice-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.invoice-form__group {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.invoice-form__legend {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-3);
  padding: 0;
}
.invoice-form__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
}
.invoice-form__lines {
  list-style: none;
  margin: var(--space-3) 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.invoice-form__line {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.invoice-form__desc {
  grid-column: 1 / -1;
}
.invoice-form__remove {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}
@media (min-width: 768px) {
  .invoice-form__line {
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
  }
  .invoice-form__desc {
    grid-column: auto;
  }
}
.invoice-form__error {
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
}
.totals {
  display: grid;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  max-width: 24rem;
  margin-left: auto;
}
.totals div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}
.totals dt {
  color: var(--color-text-secondary);
}
.totals dd {
  margin: 0;
}
.totals__main {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-2);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}
</style>
