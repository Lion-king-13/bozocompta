<script setup lang="ts">
/**
 * Import d'un relevé CSV en 3 étapes : 1. déposer · 2. vérifier l'aperçu · 3. importer.
 * Le fichier est réellement lu et contrôlé par le service. Une seule ligne invalide et le
 * fichier entier est refusé (rien n'est importé) : le rapport indique chaque ligne en erreur.
 * Cette étape n'utilise pas l'IA.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseSelect,
  DataTable,
  FileDropZone,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
  type RejectedFile,
} from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import type { CsvImportResult, CsvPreview } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '../shared/AsyncContent.vue'
import { useReferenceData } from '../shared/useReferenceData'

const services = useServices()
const router = useRouter()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

const DEMO_BASE = `${import.meta.env.BASE_URL}demo/`

const accounts = useAsync(() => services.transactions.listBankAccounts())
const bankAccountId = ref('')
const accountOptions = computed(() =>
  (accounts.data.value ?? [])
    .filter((a) => !scope.selectedEntityId || a.entityId === scope.selectedEntityId)
    .map((a) => ({
      value: a.id,
      label: `${refData.entityName(a.entityId)} — ${a.name} (${a.ibanMasked})`,
    })),
)

const file = shallowRef<File | null>(null)
const preview = shallowRef<CsvPreview | null>(null)
const result = shallowRef<CsvImportResult | null>(null)
const error = shallowRef<ApiError | null>(null)
const localError = ref('')
const busy = ref(false)

const step = computed(() => (result.value ? 3 : preview.value ? 2 : 1))

function onReject(rejected: RejectedFile[]) {
  localError.value = rejected.map((r) => r.message).join(' ')
}

function onSelect(files: File[]) {
  if (!files[0]) return
  localError.value = ''
  file.value = files[0]
  void loadPreview()
}

async function useDemoFile(name: string) {
  try {
    const response = await fetch(`${DEMO_BASE}${name}`)
    const text = await response.text()
    onSelect([new File([text], name, { type: 'text/csv' })])
  } catch {
    localError.value = "Le fichier d'exemple n'a pas pu être chargé. Réessayez."
  }
}

async function loadPreview() {
  if (!file.value) return
  busy.value = true
  error.value = null
  preview.value = null
  try {
    preview.value = await services.transactions.previewCsv(
      file.value,
      bankAccountId.value || undefined,
    )
  } catch (e) {
    error.value = toApiError(e)
  } finally {
    busy.value = false
  }
}

async function runImport() {
  if (!file.value || !bankAccountId.value) return
  busy.value = true
  error.value = null
  try {
    result.value = await services.transactions.importCsv(bankAccountId.value, file.value)
  } catch (e) {
    error.value = toApiError(e)
  } finally {
    busy.value = false
  }
}

function restart() {
  file.value = null
  preview.value = null
  result.value = null
  error.value = null
}

/** Lignes déjà présentes sur le compte choisi (QA-07) : signalées puis ignorées à l'import. */
const duplicates = computed(() => preview.value?.rows.filter((r) => r.duplicate) ?? [])
const importable = computed(() => preview.value?.rows.filter((r) => !r.duplicate) ?? [])
const debitCount = computed(() => importable.value.filter((r) => r.direction === 'debit').length)

// Compte par défaut : le premier proposé ; l'aperçu est recalculé si on en change.
watch(accountOptions, (options) => {
  if (!bankAccountId.value && options[0]) bankAccountId.value = options[0].value
})
watch(bankAccountId, () => {
  if (preview.value) void loadPreview()
})

const previewColumns: DataTableColumn[] = [
  { key: 'label', label: 'Libellé' },
  { key: 'duplicate', label: 'Contrôle' },
  { key: 'line', label: 'Ligne', hideOnMobile: true },
  { key: 'bookingDate', label: 'Date' },
  { key: 'counterpartyName', label: 'Contrepartie', hideOnMobile: true },
  { key: 'categoryCode', label: 'Catégorie', hideOnMobile: true },
  { key: 'amountCents', label: 'Montant', numeric: true },
]

function retry() {
  void refData.load()
  void accounts.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Importer des transactions (CSV)"
      description="Relevé bancaire au format CSV. Cette étape n'utilise pas l'IA."
    >
      <template #breadcrumb>
        <RouterLink :to="{ name: RouteName.Transactions }">Transactions</RouterLink>
        <span aria-hidden="true"> / </span><span>Import CSV</span>
      </template>
    </PageHeader>

    <ol class="steps" aria-label="Étapes de l'import">
      <li :aria-current="step === 1 ? 'step' : undefined" :class="{ 'is-current': step === 1 }">
        1. Déposer
      </li>
      <li :aria-current="step === 2 ? 'step' : undefined" :class="{ 'is-current': step === 2 }">
        2. Vérifier l'aperçu
      </li>
      <li :aria-current="step === 3 ? 'step' : undefined" :class="{ 'is-current': step === 3 }">
        3. Importer
      </li>
    </ol>

    <AsyncContent
      :loading="accounts.loading.value"
      :error="accounts.error.value ?? refData.error.value"
      skeleton="card"
      @retry="retry"
    >
      <div class="layout">
        <div class="stack">
          <BaseAlert
            v-if="error"
            tone="danger"
            :title="
              error.code === 'INVALID_FILE'
                ? 'Fichier refusé : rien n’a été importé'
                : error.code === 'CONFLICT'
                  ? 'Toutes les lignes sont déjà importées'
                  : 'L’import n’a pas abouti'
            "
            live
            data-testid="csv-error"
            :data-code="error.code"
          >
            <p>{{ error.message }}</p>
            <ul v-if="error.details.length" class="error-list" data-testid="csv-error-lines">
              <li v-for="d in error.details" :key="d.field + d.message">
                <strong>{{ d.field === 'file' ? 'Fichier' : d.field }}</strong> : {{ d.message }}
              </li>
            </ul>
            <p v-if="error.code === 'INVALID_FILE'">
              Corrigez le fichier puis déposez-le à nouveau. Les transactions existantes ne sont pas
              modifiées.
            </p>
            <template #actions>
              <BaseButton
                size="sm"
                variant="secondary"
                icon="refresh"
                :loading="busy"
                @click="preview ? runImport() : loadPreview()"
                >Réessayer</BaseButton
              >
              <BaseButton size="sm" variant="ghost" @click="restart"
                >Choisir un autre fichier</BaseButton
              >
            </template>
          </BaseAlert>

          <BaseCard v-if="step === 1" title="1. Déposer le relevé">
            <div class="stack">
              <BaseSelect
                v-model="bankAccountId"
                label="Compte bancaire de destination"
                :options="accountOptions"
                placeholder="Choisir un compte"
                required
                hint="Les transactions seront « payées par » l'entité de ce compte. Les lignes déjà présentes sur ce compte seront signalées."
              />
              <FileDropZone
                label="Déposez votre relevé CSV"
                accept=".csv"
                :max-size-mb="1"
                hint="Séparateur « ; », 1 Mo maximum."
                :error="localError || undefined"
                :disabled="busy"
                @select="onSelect"
                @reject="onReject"
              />
              <p v-if="busy" role="status">Lecture du fichier…</p>
              <div class="demo">
                <BaseButton
                  variant="secondary"
                  icon="file"
                  @click="useDemoFile('transactions-valide.csv')"
                  >Utiliser l'exemple valide</BaseButton
                >
                <BaseButton
                  variant="ghost"
                  icon="alert-triangle"
                  @click="useDemoFile('transactions-invalide.csv')"
                  >Utiliser l'exemple invalide</BaseButton
                >
              </div>
            </div>
          </BaseCard>

          <BaseCard v-else-if="step === 2 && preview" title="2. Vérifier l'aperçu">
            <div class="stack">
              <p data-testid="csv-preview-summary">
                <strong>{{ preview.rows.length }} ligne(s) valide(s)</strong>, 0 ligne en erreur —
                {{ debitCount }} débit(s) qui seront comptés comme dépenses. Fichier :
                {{ preview.fileName }}.
              </p>
              <BaseAlert
                v-if="duplicates.length"
                tone="warning"
                title="Doublons potentiels"
                data-testid="csv-duplicates"
              >
                {{ duplicates.length }} ligne(s) existent déjà sur ce compte (même date, montant,
                sens et libellé) : elles seront ignorées pour ne pas compter deux fois la même
                dépense.
              </BaseAlert>
              <DataTable
                :columns="previewColumns"
                :rows="preview.rows"
                row-key="line"
                caption="Aperçu des lignes lues"
              >
                <template #cell-bookingDate="{ row }">{{
                  formatIsoDate(row.bookingDate)
                }}</template>
                <template #cell-categoryCode="{ row }">{{ row.categoryCode ?? '—' }}</template>
                <template #cell-duplicate="{ row }">
                  <StatusBadge
                    v-if="row.duplicate"
                    status="duplicate"
                    size="sm"
                    data-testid="csv-duplicate-badge"
                  />
                  <StatusBadge v-else tone="success" label="Nouvelle" icon="check" size="sm" />
                </template>
                <template #cell-amountCents="{ row }">
                  {{
                    row.direction === 'debit'
                      ? formatCents(-row.amountCents)
                      : `+${formatCents(row.amountCents)}`
                  }}
                </template>
              </DataTable>
              <BaseSelect
                v-model="bankAccountId"
                label="Compte bancaire de destination"
                :options="accountOptions"
                placeholder="Choisir un compte"
                required
                hint="Les transactions seront « payées par » l'entité de ce compte."
              />
              <div class="actions">
                <BaseButton variant="secondary" @click="restart"
                  >Choisir un autre fichier</BaseButton
                >
                <BaseButton
                  icon="upload"
                  :disabled="!bankAccountId || importable.length === 0"
                  :loading="busy"
                  data-testid="csv-import"
                  @click="runImport"
                  >Importer {{ importable.length }} transaction(s)</BaseButton
                >
              </div>
            </div>
          </BaseCard>

          <BaseCard v-else-if="result" title="3. Import terminé">
            <BaseAlert tone="success" title="Import réussi" live data-testid="csv-success">
              {{ result.transactions.length }} transaction(s) importée(s) depuis
              {{ result.batch.fileName }}.
            </BaseAlert>
            <BaseAlert
              v-if="result.skippedDuplicates.length"
              tone="warning"
              title="Doublons ignorés"
              data-testid="csv-skipped"
            >
              {{ result.skippedDuplicates.length }} ligne(s) déjà présentes n'ont pas été importées
              :
              <ul class="error-list">
                <li v-for="d in result.skippedDuplicates" :key="d.line">
                  ligne {{ d.line }} — {{ d.label }} ({{ formatIsoDate(d.bookingDate) }},
                  {{ formatCents(d.amountCents) }})
                </li>
              </ul>
            </BaseAlert>
            <div class="actions">
              <BaseButton variant="secondary" @click="restart"
                >Importer un autre fichier</BaseButton
              >
              <BaseButton icon="arrow-right" @click="router.push({ name: RouteName.Transactions })"
                >Voir les transactions</BaseButton
              >
            </div>
          </BaseCard>
        </div>

        <BaseCard title="Format attendu" :heading-level="2">
          <ul class="format">
            <li>Encodage UTF-8, séparateur <code>;</code>, première ligne = en-tête.</li>
            <li>
              Colonnes : <code>date;libelle;contrepartie;montant;sens</code> et
              <code>categorie</code> (facultative).
            </li>
            <li>
              Date au format AAAA-MM-JJ ; montant positif (ex. <code>23,90</code>) ; sens
              <code>debit</code> ou <code>credit</code>.
            </li>
            <li>Une seule ligne invalide : le fichier entier est refusé.</li>
          </ul>
          <p class="small">
            Télécharger un exemple :
            <a :href="`${DEMO_BASE}transactions-valide.csv`" download>transactions-valide.csv</a> ·
            <a :href="`${DEMO_BASE}transactions-invalide.csv`" download
              >transactions-invalide.csv</a
            >
          </p>
        </BaseCard>
      </div>
    </AsyncContent>
  </div>
</template>

<style scoped>
.steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin: 0;
  padding: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.steps .is-current {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}
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
.demo,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.actions {
  justify-content: flex-end;
  margin-top: var(--space-3);
}
.error-list {
  margin: var(--space-2) 0;
  padding-left: var(--space-5);
}
.format {
  padding-left: var(--space-5);
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.small {
  font-size: var(--font-size-sm);
}
</style>
