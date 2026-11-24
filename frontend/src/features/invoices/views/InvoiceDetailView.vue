<script setup lang="ts">
/**
 * Détail d'une facture : en-tête, lignes, HT / TVA / TTC, statut, document source,
 * rapprochement lié et imputations (lecture seule), puis correction et validation humaine,
 * ou contestation (QA-19). Une facture payée, annulée ou rapprochée n'est plus modifiable
 * (D15) : l'écran passe en lecture seule et l'explique.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseCheckbox,
  BaseDialog,
  BaseTextField,
  PageHeader,
  StatusBadge,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatBasisPoints, formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import {
  ROLE_LABELS,
  type Allocation,
  type BankTransactionView,
  type Invoice,
  type Reconciliation,
} from '@/domain'
import { allocationsForTransaction } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { INVOICE_STATUS_TO_UI } from '@/features/transactions/shared/labels'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import DuplicateInvoiceDialog from '../components/DuplicateInvoiceDialog.vue'
import InvoiceFormFields from '../components/InvoiceFormFields.vue'
import ProvenanceLegend from '../components/ProvenanceLegend.vue'
import {
  cloneForm,
  formToInput,
  hasUnreviewedAiValues,
  invoiceToForm,
  duplicateMessage,
  isDuplicateConflict,
  serviceErrorsToForm,
  type FormErrors,
  type InvoiceForm,
  type InvoiceFormOrigin,
} from '../invoiceForm'
import { useInvoiceOptions } from '../useInvoiceOptions'

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const toast = useToasts()
const refData = useReferenceData()
const options = useInvoiceOptions(refData)
void refData.load()

const invoiceId = computed(() => String(route.params.invoiceId))
const invoice = useAsync(() => services.invoices.getInvoice(invoiceId.value))

/** Rapprochements, transaction liée et imputations : chargés si les droits le permettent. */
const reconciliations = shallowRef<Reconciliation[]>([])
const linkedTx = shallowRef<BankTransactionView | null>(null)
const allocations = shallowRef<Allocation[]>([])

async function loadLinks(current: Invoice) {
  reconciliations.value = []
  linkedTx.value = null
  allocations.value = []
  if (!auth.can('reconciliations:read')) return
  try {
    reconciliations.value = (await services.reconciliations.listReconciliations()).filter(
      (r) => r.invoiceId === current.id,
    )
    const confirmed = reconciliations.value.find((r) => r.status === 'confirmed')
    if (!confirmed) return
    linkedTx.value = await services.transactions.getTransaction(confirmed.transactionId)
    if (auth.can('allocations:read')) {
      const explicit = await services.allocations.listAllocations({
        transactionId: confirmed.transactionId,
      })
      allocations.value = allocationsForTransaction(linkedTx.value, explicit)
    }
  } catch {
    // Informations secondaires : leur absence n'empêche pas de corriger la facture.
  }
}

const origin = shallowRef<InvoiceFormOrigin | null>(null)
const form = ref<InvoiceForm | null>(null)
const errors = ref<FormErrors>({})
const verified = ref(false)
const saving = ref(false)
const actionError = shallowRef<ApiError | null>(null)
/** Vient d'être validée : on propose la suggestion de rapprochement éventuelle. */
const justValidated = ref(false)
const duplicateOpen = ref(false)
const duplicateText = ref('')
let afterDuplicate: (() => Promise<void>) | null = null

watch(
  () => invoice.data.value,
  (current) => {
    if (!current) return
    origin.value = invoiceToForm(current)
    form.value = cloneForm(origin.value.values)
    errors.value = {}
    verified.value = false
    void loadLinks(current)
  },
)
watch(invoiceId, () => void invoice.run())

const canWrite = computed(() => auth.can('invoices:write'))
/** Payée, annulée ou rapprochée : plus modifiable (D15, QA-11). */
const locked = computed(
  () => ['paid', 'cancelled'].includes(invoice.data.value?.status ?? '') || linkedTx.value !== null,
)
const editable = computed(() => canWrite.value && !locked.value)
const canValidate = computed(
  () => editable.value && ['to_review', 'disputed'].includes(invoice.data.value?.status ?? ''),
)
const canContest = computed(
  () => editable.value && ['to_review', 'approved'].includes(invoice.data.value?.status ?? ''),
)
const dirty = computed(
  () =>
    !!form.value &&
    !!origin.value &&
    JSON.stringify(form.value) !== JSON.stringify(origin.value.values),
)
const needsVerification = computed(
  () => !!form.value && !!origin.value && hasUnreviewedAiValues(form.value, origin.value),
)
const pendingSuggestion = computed(() =>
  reconciliations.value.find((r) => r.status === 'suggested'),
)

/**
 * Enregistre les corrections. Un doublon (même fournisseur + même numéro, QA-08) ouvre une
 * confirmation ; `next` est l'action à reprendre si l'utilisateur confirme.
 */
async function save(allowDuplicate = false, next?: () => Promise<void>): Promise<boolean> {
  const current = invoice.data.value
  if (!form.value || !current) return false
  const { input, errors: formErrors } = formToInput(form.value)
  errors.value = formErrors
  if (!input) return false
  try {
    invoice.data.value = await services.invoices.updateInvoice(current.id, input, {
      allowDuplicate,
    })
    return true
  } catch (e) {
    const apiError = toApiError(e)
    if (isDuplicateConflict(apiError)) {
      duplicateText.value = duplicateMessage(input, refData.supplierName(input.supplierId))
      afterDuplicate = next ?? null
      duplicateOpen.value = true
      return false
    }
    if (apiError.code === 'VALIDATION_ERROR') errors.value = serviceErrorsToForm(apiError.details)
    actionError.value = apiError
    return false
  }
}

async function saveCorrections(allowDuplicate = false) {
  actionError.value = null
  saving.value = true
  if (await save(allowDuplicate, () => saveCorrections(true))) {
    toast.success('Corrections enregistrées. Les valeurs modifiées sont marquées « Corrigé ».')
  }
  saving.value = false
}

async function confirmDuplicate() {
  duplicateOpen.value = false
  if (afterDuplicate) await afterDuplicate()
}

async function validate(allowDuplicate = false) {
  const current = invoice.data.value
  if (!current) return
  actionError.value = null
  justValidated.value = false
  if (needsVerification.value && !verified.value) {
    errors.value = {
      ...errors.value,
      verified: 'Cochez la case après avoir vérifié les valeurs extraites.',
    }
    return
  }
  saving.value = true
  try {
    if (dirty.value && !(await save(allowDuplicate, () => validate(true)))) return
    invoice.data.value = await services.invoices.validateInvoice(current.id)
    justValidated.value = true
    toast.success('Facture validée et enregistrée.')
  } catch (e) {
    actionError.value = toApiError(e)
  } finally {
    saving.value = false
  }
}

/* ---- Contestation (QA-19) ---- */
const contestOpen = ref(false)
const contestReason = ref('')
const contesting = ref(false)

function openContest() {
  contestReason.value = ''
  contestOpen.value = true
}

async function contest() {
  const current = invoice.data.value
  if (!current) return
  contesting.value = true
  actionError.value = null
  try {
    invoice.data.value = await services.invoices.rejectInvoice(
      current.id,
      contestReason.value.trim() || undefined,
    )
    contestOpen.value = false
    toast.info('Facture contestée : elle reste hors des dépenses et peut être corrigée.')
  } catch (e) {
    actionError.value = toApiError(e)
    contestOpen.value = false
  } finally {
    contesting.value = false
  }
}

function resetForm() {
  if (origin.value) form.value = cloneForm(origin.value.values)
  errors.value = {}
}

function retry() {
  void refData.load()
  void invoice.run()
}

function formatSize(bytes: number): string {
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} Ko` : `${bytes} octets`
}
</script>

<template>
  <AsyncContent
    :loading="invoice.loading.value && !invoice.data.value"
    :error="invoice.error.value ?? refData.error.value"
    :error-title="
      invoice.error.value?.code === 'NOT_FOUND'
        ? 'Cette facture n’existe pas ou a été supprimée'
        : 'Impossible de charger la facture'
    "
    skeleton="card"
    loading-label="Chargement de la facture"
    @retry="retry"
  >
    <div
      v-if="invoice.data.value && form && origin"
      class="stack"
      style="--stack-gap: var(--space-5)"
    >
      <PageHeader
        :title="`Facture ${invoice.data.value.number}`"
        :description="`${refData.supplierName(invoice.data.value.supplierId)} · émise le ${formatIsoDate(invoice.data.value.issueDate)} · ${refData.entityName(invoice.data.value.entityId)}`"
      >
        <template #breadcrumb>
          <RouterLink :to="{ name: RouteName.Invoices }">Factures</RouterLink>
          <span aria-hidden="true"> / </span><span>{{ invoice.data.value.number }}</span>
        </template>
        <template #meta>
          <StatusBadge :status="INVOICE_STATUS_TO_UI[invoice.data.value.status]" />
          <AiProvenanceBadge
            :provenance="invoice.data.value.provenance"
            data-testid="invoice-provenance"
          />
        </template>
      </PageHeader>

      <BaseAlert
        v-if="justValidated && pendingSuggestion"
        tone="info"
        title="Une transaction correspondante a été proposée par l'IA"
        live
        dismissible
        @dismiss="justValidated = false"
      >
        <RouterLink :to="{ name: RouteName.Reconciliations, query: { status: 'suggested' } }"
          >Voir la suggestion de rapprochement</RouterLink
        >
      </BaseAlert>
      <BaseAlert
        v-if="invoice.data.value.status === 'disputed'"
        tone="warning"
        title="Facture contestée"
        data-testid="invoice-disputed"
      >
        {{
          invoice.data.value.disputeReason
            ? `Motif : ${invoice.data.value.disputeReason}`
            : 'Aucun motif saisi.'
        }}
        Corrigez-la puis validez-la, ou laissez-la contestée.
      </BaseAlert>
      <BaseAlert v-if="canWrite && locked" tone="info" data-testid="invoice-locked">
        <template v-if="invoice.data.value.status === 'paid'">
          Facture payée{{
            invoice.data.value.paidAt ? ` le ${formatIsoDate(invoice.data.value.paidAt)}` : ''
          }}{{ linkedTx ? ' et rapprochée de son paiement' : '' }} : elle n'est plus modifiable.
        </template>
        <template v-else-if="invoice.data.value.status === 'cancelled'">
          Facture annulée : elle n'est plus modifiable.
        </template>
        <template v-else>Facture rapprochée de son paiement : elle n'est plus modifiable.</template>
      </BaseAlert>
      <BaseAlert
        v-if="actionError"
        tone="danger"
        title="L'action n'a pas abouti"
        live
        data-testid="action-error"
        :data-code="actionError.code"
      >
        {{ actionError.message }} Votre saisie est conservée.
      </BaseAlert>
      <BaseAlert v-if="!canWrite" tone="info">
        Vous pouvez consulter cette facture mais pas la modifier (rôle
        {{ auth.user ? ROLE_LABELS[auth.user.role] : '' }}).
      </BaseAlert>

      <div class="layout">
        <BaseCard title="Données et lignes" class="layout__main">
          <div class="stack" style="--stack-gap: var(--space-5)">
            <ProvenanceLegend v-if="editable" />
            <InvoiceFormFields
              v-model:form="form"
              :origin="origin"
              :errors="errors"
              :readonly="!editable"
              :supplier-options="options.supplierOptions.value"
              :entity-options="options.entityOptions.value"
              :category-options="options.categoryOptions.value"
              original-label="Valeur avant correction"
            />
            <template v-if="editable">
              <BaseCheckbox
                v-if="canValidate && needsVerification"
                v-model="verified"
                label="J'ai vérifié les données extraites"
                description="Des valeurs sont encore « Extrait par l’IA » : contrôlez-les avant de valider."
                :error="errors.verified"
              />
              <div class="actions">
                <BaseButton v-if="dirty" variant="ghost" @click="resetForm"
                  >Annuler les modifications</BaseButton
                >
                <BaseButton
                  v-if="canContest"
                  variant="ghost"
                  icon="alert-circle"
                  data-testid="contest-invoice"
                  @click="openContest"
                  >Contester…</BaseButton
                >
                <BaseButton
                  variant="secondary"
                  :disabled="!dirty"
                  :loading="saving && !canValidate"
                  @click="saveCorrections()"
                  >Enregistrer les corrections</BaseButton
                >
                <BaseButton
                  v-if="canValidate"
                  icon="check"
                  :loading="saving"
                  data-testid="validate-invoice"
                  @click="validate()"
                  >Valider et enregistrer</BaseButton
                >
              </div>
            </template>
          </div>
        </BaseCard>

        <div class="layout__side stack">
          <BaseCard title="Document source" :heading-level="2">
            <template v-if="invoice.data.value.sourceDocument">
              <p>
                <strong>{{ invoice.data.value.sourceDocument.fileName }}</strong>
              </p>
              <p class="text-secondary small">
                {{ formatSize(invoice.data.value.sourceDocument.sizeBytes) }} · importé le
                {{ formatIsoDate(invoice.data.value.sourceDocument.uploadedAt.slice(0, 10)) }}
              </p>
              <p class="small">
                Document fictif : en mode démonstration, le PDF d'origine n'est pas conservé.
                <a href="/demo/facture-demo.pdf" target="_blank" rel="noopener"
                  >Ouvrir un PDF d'exemple</a
                >
              </p>
            </template>
            <p v-else class="text-secondary">Aucun document source.</p>
          </BaseCard>

          <BaseCard title="Rapprochement" :heading-level="2" data-testid="invoice-reconciliation">
            <template v-if="linkedTx">
              <StatusBadge status="reconciled" size="sm" />
              <p>
                Paiement du {{ formatIsoDate(linkedTx.bookingDate) }} :
                <strong class="tabular-nums">{{ formatCents(linkedTx.amountCents) }}</strong>
              </p>
              <p class="small text-secondary">{{ linkedTx.label }}</p>
              <RouterLink
                :to="{ name: RouteName.TransactionDetail, params: { transactionId: linkedTx.id } }"
                >Voir la transaction</RouterLink
              >
            </template>
            <template v-else-if="pendingSuggestion">
              <AiProvenanceBadge provenance="suggested" size="sm" />
              <p class="small">Une suggestion attend une décision humaine.</p>
              <RouterLink :to="{ name: RouteName.Reconciliations }"
                >Traiter la suggestion</RouterLink
              >
            </template>
            <template v-else>
              <StatusBadge status="not_reconciled" size="sm" />
              <p class="small text-secondary">Aucun paiement rapproché pour cette facture.</p>
              <RouterLink
                v-if="auth.can('reconciliations:read')"
                :to="{ name: RouteName.Reconciliations }"
                >Rapprocher manuellement</RouterLink
              >
            </template>
          </BaseCard>

          <BaseCard
            title="Imputations"
            :heading-level="2"
            description="Ventilation du paiement lié (lecture seule)."
          >
            <ul
              v-if="allocations.length && linkedTx"
              class="alloc-list"
              data-testid="invoice-allocations"
            >
              <li v-for="a in allocations" :key="a.id">
                <span>Imputé à {{ refData.targetLabel(a.entityId, a.costCenterId) }}</span>
                <span class="tabular-nums"
                  >{{ formatBasisPoints(a.percentBp) }} · {{ formatCents(a.amountCents) }}</span
                >
              </li>
            </ul>
            <p v-if="linkedTx" class="small text-secondary">
              Payé par {{ refData.entityName(linkedTx.entityId) }}
              <template v-if="linkedTx.cardId">
                ({{ refData.cardHolderName(linkedTx.cardId) }}, carte
                {{ refData.cardLabel(linkedTx.cardId) }})</template
              >.
              <RouterLink
                v-if="auth.can('allocations:read')"
                :to="{ name: RouteName.AllocationEditor, params: { transactionId: linkedTx.id } }"
                >Voir la répartition</RouterLink
              >
            </p>
            <p v-else class="small text-secondary">
              Les imputations portent sur le paiement : rapprochez d'abord la facture.
            </p>
          </BaseCard>
        </div>
      </div>
      <DuplicateInvoiceDialog
        v-model:open="duplicateOpen"
        :message="duplicateText"
        :saving="saving"
        @confirm="confirmDuplicate"
      />
      <BaseDialog
        v-model:open="contestOpen"
        title="Contester cette facture ?"
        description="La facture passe au statut « Contestée ». Elle n'entre pas dans les dépenses."
        size="sm"
        :persistent="contesting"
      >
        <BaseTextField
          v-model="contestReason"
          label="Motif (facultatif)"
          placeholder="Ex. montant différent du devis"
        />
        <template #footer>
          <BaseButton variant="secondary" :disabled="contesting" @click="contestOpen = false"
            >Annuler</BaseButton
          >
          <BaseButton
            variant="danger"
            :loading="contesting"
            data-testid="confirm-contest"
            @click="contest"
            >Contester la facture</BaseButton
          >
        </template>
      </BaseDialog>
    </div>
  </AsyncContent>
</template>

<style scoped>
.layout {
  display: grid;
  gap: var(--space-5);
  align-items: start;
}
@media (min-width: 1024px) {
  .layout {
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  }
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
.small {
  font-size: var(--font-size-sm);
}
.alloc-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.alloc-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.layout__side p {
  margin: var(--space-2) 0;
}
</style>
