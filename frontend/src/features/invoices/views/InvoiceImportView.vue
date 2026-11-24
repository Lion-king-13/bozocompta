<script setup lang="ts">
/**
 * Import d'une facture PDF en 3 étapes : 1. déposer · 2. extraction (SIMULÉE en démo) ·
 * 3. vérifier, corriger et valider. Rien n'est enregistré avant la validation humaine.
 * En cas d'erreur (fichier invalide, IA indisponible, quota, réseau), le fichier choisi et la
 * saisie sont conservés et l'utilisateur peut réessayer.
 */
import { computed, onMounted, ref, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseCheckbox,
  BaseSelect,
  FileDropZone,
  LoadingSkeleton,
  PageHeader,
  type RejectedFile,
} from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import type { InvoiceDraft } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'
import InvoiceFormFields from '../components/InvoiceFormFields.vue'
import {
  draftToForm,
  formToInput,
  hasUnreviewedAiValues,
  serviceErrorsToForm,
  type FormErrors,
  type InvoiceForm,
  type InvoiceFormOrigin,
} from '../invoiceForm'
import { useInvoiceOptions } from '../useInvoiceOptions'

const services = useServices()
const router = useRouter()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
const options = useInvoiceOptions(refData)

const DEMO_BASE = `${import.meta.env.BASE_URL}demo/`

type Step = 1 | 2 | 3
const step = ref<Step>(1)
const entityId = ref('')
const selectedFile = shallowRef<File | null>(null)
const localError = ref('')
const extractError = shallowRef<ApiError | null>(null)

const draft = shallowRef<InvoiceDraft | null>(null)
const origin = shallowRef<InvoiceFormOrigin | null>(null)
const form = ref<InvoiceForm | null>(null)
const errors = ref<FormErrors>({})
const verified = ref(false)
const saving = ref(false)
const saveError = shallowRef<ApiError | null>(null)

onMounted(async () => {
  await refData.load()
  entityId.value = scope.selectedEntityId ?? auth.user?.entityIds[0] ?? ''
})

const steps = [
  { id: 1, label: 'Déposer le PDF' },
  { id: 2, label: "Extraction par l'IA" },
  { id: 3, label: 'Vérifier et valider' },
] as const

function onReject(rejected: RejectedFile[]) {
  localError.value = rejected.map((r) => r.message).join(' ')
}

function onSelect(files: File[]) {
  const file = files[0]
  if (!file) return
  localError.value = ''
  selectedFile.value = file
  void extract()
}

/** Charge un des PDF fictifs fournis avec la démonstration. */
async function useDemoFile(name: string) {
  localError.value = ''
  try {
    const response = await fetch(`${DEMO_BASE}${name}`)
    const blob = await response.blob()
    onSelect([new File([blob], name, { type: 'application/pdf' })])
  } catch {
    localError.value = "Le fichier d'exemple n'a pas pu être chargé. Réessayez."
  }
}

async function extract() {
  if (!selectedFile.value) return
  extractError.value = null
  step.value = 2
  try {
    const result = await services.invoices.importInvoicePdf(selectedFile.value)
    const start = draftToForm(result, entityId.value)
    draft.value = result
    origin.value = start
    form.value = { ...start.values, lines: start.values.lines.map((l) => ({ ...l })) }
    errors.value = {}
    verified.value = false
    step.value = 3
  } catch (e) {
    extractError.value = toApiError(e)
    step.value = 1
  }
}

function restart() {
  step.value = 1
  draft.value = null
  form.value = null
  origin.value = null
  selectedFile.value = null
  extractError.value = null
  saveError.value = null
}

const needsVerification = computed(
  () => !!form.value && !!origin.value && hasUnreviewedAiValues(form.value, origin.value),
)

async function confirm() {
  if (!form.value || !draft.value) return
  saveError.value = null
  const { input, errors: formErrors } = formToInput(form.value)
  errors.value = formErrors
  if (!verified.value)
    errors.value = { ...errors.value, verified: 'Cochez la case après vérification.' }
  if (!input || !verified.value) return
  saving.value = true
  try {
    const invoice = await services.invoices.confirmDraft(draft.value.id, input)
    await router.push({ name: RouteName.Invoices, query: { created: invoice.number } })
  } catch (e) {
    const apiError = toApiError(e)
    if (apiError.code === 'VALIDATION_ERROR') errors.value = serviceErrorsToForm(apiError.details)
    saveError.value = apiError
  } finally {
    saving.value = false
  }
}

/** Titre et ton de l'alerte selon l'erreur d'extraction (les quatre erreurs simulables). */
const extractAlert = computed(() => {
  const e = extractError.value
  if (!e) return null
  switch (e.code) {
    case 'INVALID_FILE':
      return { tone: 'danger' as const, title: 'Fichier invalide' }
    case 'AI_UNAVAILABLE':
      return { tone: 'warning' as const, title: 'Service IA indisponible' }
    case 'AI_QUOTA_EXCEEDED':
      return { tone: 'danger' as const, title: 'Quota IA atteint' }
    default:
      return { tone: 'danger' as const, title: "L'import n'a pas abouti" }
  }
})
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-6)">
    <PageHeader
      title="Importer une facture PDF"
      description="L'IA propose les valeurs, vous les vérifiez : rien n'est enregistré sans votre validation."
    >
      <template #breadcrumb>
        <RouterLink :to="{ name: RouteName.Invoices }">Factures</RouterLink>
        <span aria-hidden="true"> / </span><span>Import PDF</span>
      </template>
    </PageHeader>

    <ol class="steps" aria-label="Étapes de l'import">
      <li
        v-for="s in steps"
        :key="s.id"
        class="steps__item"
        :class="{ 'is-current': step === s.id, 'is-done': step > s.id }"
        :aria-current="step === s.id ? 'step' : undefined"
      >
        <span class="steps__number" aria-hidden="true">{{ s.id }}</span>
        {{ s.label }}
      </li>
    </ol>

    <BaseAlert tone="info" title="Extraction simulée en mode démonstration">
      Aucune IA n'est appelée : après le contrôle réel du fichier (type, taille, en-tête PDF),
      l'extraction renvoie toujours le contenu de la facture d'exemple « Bureau &amp; Co ».
      N'utilisez pas de vraie facture.
    </BaseAlert>

    <AsyncContent
      :loading="refData.loading.value"
      :error="refData.error.value"
      skeleton="card"
      @retry="refData.load"
    >
      <!-- Étape 1 : dépôt -->
      <BaseCard v-if="step === 1" title="1. Déposer le PDF">
        <div class="stack">
          <BaseSelect
            v-model="entityId"
            label="Entité destinataire"
            :options="options.entityOptions.value"
            placeholder="Choisir une entité"
            hint="Vous pourrez la modifier à l'étape de vérification."
          />

          <BaseAlert
            v-if="extractError && extractAlert"
            :tone="extractAlert.tone"
            :title="extractAlert.title"
            live
            data-testid="import-error"
            :data-code="extractError.code"
          >
            <p>{{ extractError.message }}</p>
            <ul v-if="extractError.details.length" class="details">
              <li v-for="d in extractError.details" :key="d.message">{{ d.message }}</li>
            </ul>
            <p v-if="selectedFile">
              Fichier conservé : <strong>{{ selectedFile.name }}</strong>. Aucune donnée n'a été
              enregistrée.
            </p>
            <p v-if="extractError.code === 'AI_QUOTA_EXCEEDED'">
              Le quota se renouvelle au début du mois prochain.
              <RouterLink v-if="auth.can('ai-usage:read')" :to="{ name: RouteName.AiUsage }"
                >Voir la consommation IA</RouterLink
              >
            </p>
            <template #actions>
              <BaseButton size="sm" variant="secondary" icon="refresh" @click="extract"
                >Réessayer</BaseButton
              >
            </template>
          </BaseAlert>

          <FileDropZone
            label="Déposez votre facture PDF"
            accept=".pdf"
            :max-size-mb="5"
            hint="PDF textuel (non scanné), 5 Mo maximum."
            :error="localError || undefined"
            @select="onSelect"
            @reject="onReject"
          />

          <div class="demo-files">
            <p class="text-secondary">Fichiers fictifs fournis pour la démonstration :</p>
            <div class="demo-files__actions">
              <BaseButton variant="secondary" icon="file" @click="useDemoFile('facture-demo.pdf')"
                >Utiliser la facture d'exemple</BaseButton
              >
              <BaseButton variant="ghost" icon="alert-triangle" @click="useDemoFile('faux-pdf.pdf')"
                >Essayer un faux PDF (fichier invalide)</BaseButton
              >
            </div>
            <p class="text-secondary demo-files__links">
              Télécharger :
              <a :href="`${DEMO_BASE}facture-demo.pdf`" download>facture-demo.pdf</a> ·
              <a :href="`${DEMO_BASE}faux-pdf.pdf`" download>faux-pdf.pdf</a>
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Étape 2 : extraction en cours -->
      <BaseCard v-else-if="step === 2" title="2. Extraction par l'IA">
        <p role="status">L'IA lit la facture « {{ selectedFile?.name }} »… (extraction simulée)</p>
        <LoadingSkeleton variant="card" label="Extraction en cours" />
      </BaseCard>

      <!-- Étape 3 : vérification et validation -->
      <BaseCard v-else-if="form && origin && draft" title="3. Vérifier, corriger et valider">
        <div class="stack" style="--stack-gap: var(--space-5)">
          <p class="text-secondary">
            Fichier : <strong>{{ draft.fileName }}</strong> · {{ draft.tokensUsed }} tokens IA
            (simulés) · Chaque valeur indique sa provenance ; modifiez ce qui est faux.
          </p>
          <InvoiceFormFields
            v-model:form="form"
            :origin="origin"
            :errors="errors"
            :supplier-options="options.supplierOptions.value"
            :entity-options="options.entityOptions.value"
            :category-options="options.categoryOptions.value"
            :extracted-supplier-name="draft.supplierName.value"
          />

          <BaseAlert
            v-if="saveError"
            tone="danger"
            title="La facture n'a pas été enregistrée"
            live
            data-testid="save-error"
            :data-code="saveError.code"
          >
            {{ saveError.message }} Votre saisie est conservée.
            <template #actions>
              <BaseButton
                size="sm"
                variant="secondary"
                icon="refresh"
                :loading="saving"
                @click="confirm"
                >Réessayer</BaseButton
              >
            </template>
          </BaseAlert>

          <BaseCheckbox
            v-model="verified"
            label="J'ai vérifié les données extraites"
            :description="
              needsVerification
                ? 'Certaines valeurs sont encore « Extrait par l’IA » : contrôlez-les avant de valider.'
                : 'Toutes les valeurs ont été relues.'
            "
            :error="errors.verified"
          />
          <div class="form-actions">
            <BaseButton variant="secondary" @click="restart">Annuler l'import</BaseButton>
            <BaseButton icon="check" :loading="saving" data-testid="confirm-draft" @click="confirm"
              >Valider et enregistrer</BaseButton
            >
          </div>
        </div>
      </BaseCard>
    </AsyncContent>
  </div>
</template>

<style scoped>
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.steps__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.steps__item.is-current {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}
.steps__number {
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
}
.is-current .steps__number {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}
.is-done .steps__number {
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
  color: var(--color-success-text);
}
.details {
  margin: var(--space-2) 0;
  padding-left: var(--space-5);
}
.demo-files__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.demo-files__links {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}
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
