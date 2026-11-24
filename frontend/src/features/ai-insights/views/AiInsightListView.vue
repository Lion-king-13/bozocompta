<script setup lang="ts">
/**
 * Analyses et suggestions IA. L'IA PROPOSE, l'humain DÉCIDE : chaque suggestion montre sa
 * justification, les pièces concernées et l'économie estimée ; « Accepter » ou « Ignorer »
 * est tracé (qui, quand) et ne modifie aucune donnée financière.
 * « Lancer une analyse » est une SIMULATION (aucun appel IA réel) qui consomme du quota
 * de démonstration et peut échouer (IA indisponible, quota dépassé).
 * Filtres dans l'URL : `?type=&status=open|resolved|dismissed&entityId=`.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AiProvenanceBadge,
  BaseAlert,
  BaseButton,
  BaseSelect,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { toApiError, type ApiError } from '@/core/errors'
import { formatCents } from '@/core/money'
import { AI_INSIGHT_TYPE_LABELS, type AiInsight, type AiInsightStatus } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncBlock from '@/features/dashboard/components/AsyncBlock.vue'
import { useReferenceLabels } from '@/features/dashboard/composables/useReferenceLabels'
import {
  INSIGHT_TYPES,
  SEVERITY,
  STATUS_LABELS,
  analysisErrorMessage,
  countByType,
  formatDateTime,
} from '../insightModel'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const services = useServices()
const labels = useReferenceLabels()

const q = (key: string) =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : ''
const typeFilter = computed(() => q('type'))
const statusFilter = computed(() => q('status'))
const entityId = computed(() => q('entityId') || scope.selectedEntityId || '')
function setFilter(key: string, value: string): void {
  void router.replace({ query: { ...route.query, [key]: value || undefined } })
}

// Toutes les suggestions du périmètre ; les filtres type / statut s'appliquent à l'affichage.
const insights = useAsync(
  () => services.aiInsights.listInsights(entityId.value ? { entityId: entityId.value } : {}),
  { immediate: false },
)
watch(entityId, () => void insights.run(), { immediate: true })

const visible = computed(() =>
  (insights.data.value ?? []).filter(
    (i) =>
      (!typeFilter.value || i.type === typeFilter.value) &&
      (!statusFilter.value || i.status === statusFilter.value),
  ),
)
const openCount = computed(
  () => (insights.data.value ?? []).filter((i) => i.status === 'open').length,
)

// ── Libellés des pièces concernées (chargés seulement si le rôle y a accès) ──────────────────
const invoiceLabels = ref(new Map<string, string>())
const transactionLabels = ref(new Map<string, string>())
const subscriptionLabels = ref(new Map<string, string>())
/** Charge une liste si le rôle y a droit ; en cas d'échec, libellés de repli (identifiants). */
async function optional<T>(allowed: boolean, load: () => Promise<T>): Promise<T | null> {
  if (!allowed) return null
  try {
    return await load()
  } catch {
    return null
  }
}
async function loadPieces(): Promise<void> {
  const [, invoices, transactions, subs] = await Promise.all([
    labels.load(),
    optional(auth.can('invoices:read'), () => services.invoices.listInvoices({ pageSize: 200 })),
    optional(auth.can('transactions:read'), () =>
      services.transactions.listTransactions({ pageSize: 200 }),
    ),
    optional(auth.can('subscriptions:read'), () => services.subscriptions.listSubscriptions()),
  ])
  invoiceLabels.value = new Map(
    (invoices?.items ?? []).map((i) => [
      i.id,
      `Facture ${i.number} · ${labels.supplier(i.supplierId)}`,
    ]),
  )
  transactionLabels.value = new Map(
    (transactions?.items ?? []).map((t) => [
      t.id,
      `${t.counterpartyName} · ${formatCents(t.amountCents)}`,
    ]),
  )
  subscriptionLabels.value = new Map((subs ?? []).map((s) => [s.id, s.name]))
}
void loadPieces()

// ── Lancer une analyse (simulation) ─────────────────────────────────────────────────────────
const running = ref(false)
const runError = ref<ApiError | null>(null)
const runResult = ref<number | null>(null)
async function runAnalysis(): Promise<void> {
  running.value = true
  runError.value = null
  runResult.value = null
  try {
    const result = await services.aiInsights.runAnalysis()
    runResult.value = result.length
    void insights.run()
  } catch (e) {
    runError.value = toApiError(e)
  } finally {
    running.value = false
  }
}

// ── Décision humaine ────────────────────────────────────────────────────────────────────────
const deciding = ref<string | null>(null)
const decisionMessage = ref<{ tone: 'success' | 'danger'; text: string } | null>(null)
async function decide(insight: AiInsight, status: Exclude<AiInsightStatus, 'open'>): Promise<void> {
  deciding.value = insight.id
  decisionMessage.value = null
  try {
    if (status === 'resolved') await services.aiInsights.resolveInsight(insight.id)
    else await services.aiInsights.dismissInsight(insight.id)
    decisionMessage.value = {
      tone: 'success',
      text: `Suggestion « ${insight.title} » ${status === 'resolved' ? 'acceptée' : 'ignorée'}. Aucune donnée n’a été modifiée automatiquement.`,
    }
    await insights.run()
  } catch (e) {
    decisionMessage.value = { tone: 'danger', text: toApiError(e).message }
  } finally {
    deciding.value = null
  }
}

const counts = computed(() => countByType(insights.data.value ?? []))
const typeOptions = computed(() => [
  { value: '', label: 'Tous les types' },
  ...INSIGHT_TYPES.map((t) => ({
    value: t,
    label: `${AI_INSIGHT_TYPE_LABELS[t]} (${counts.value[t]})`,
  })),
])
const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'open', label: 'Ouvertes' },
  { value: 'resolved', label: 'Acceptées' },
  { value: 'dismissed', label: 'Ignorées' },
]
const entityOptions = computed(() => [
  { value: '', label: 'Toute l’organisation' },
  ...labels.entities.value.map((e) => ({ value: e.id, label: e.name })),
])
const errorInfo = computed(() => (runError.value ? analysisErrorMessage(runError.value) : null))
</script>

<template>
  <div class="page">
    <PageHeader
      title="Analyses et suggestions IA"
      description="Anomalies, doublons potentiels, hausses de prix, abonnements redondants et optimisations détectés par l’IA. Vous décidez de la suite."
    >
      <template #actions>
        <BaseButton
          icon="sparkle"
          :loading="running"
          data-testid="run-analysis"
          @click="runAnalysis"
        >
          Lancer une analyse (simulation)
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert tone="info" title="Mode démonstration" class="block">
      « Lancer une analyse » est simulé : aucun service d’IA réel n’est appelé. L’opération consomme
      néanmoins du quota IA de démonstration, comme le ferait une vraie analyse. Une analyse échouée
      ne consomme rien.
    </BaseAlert>

    <div
      v-if="runError && errorInfo"
      data-testid="analysis-error"
      :data-code="runError.code"
      class="block"
    >
      <BaseAlert tone="danger" :title="errorInfo.title" live>
        {{ errorInfo.text }}
        <template #actions>
          <BaseButton size="sm" variant="secondary" :loading="running" @click="runAnalysis">
            Réessayer
          </BaseButton>
          <RouterLink v-if="auth.can('ai-usage:read')" :to="{ name: RouteName.AiUsage }">
            Voir la consommation IA
          </RouterLink>
        </template>
      </BaseAlert>
    </div>
    <BaseAlert
      v-if="runResult !== null"
      tone="success"
      title="Analyse simulée terminée"
      dismissible
      live
      class="block"
      data-testid="analysis-success"
      @dismiss="runResult = null"
    >
      {{ runResult }} suggestion(s) ouverte(s) à examiner. Rien n’a été appliqué automatiquement.
    </BaseAlert>
    <BaseAlert
      v-if="decisionMessage"
      :tone="decisionMessage.tone"
      dismissible
      live
      class="block"
      @dismiss="decisionMessage = null"
    >
      {{ decisionMessage.text }}
    </BaseAlert>

    <div class="filters">
      <BaseSelect
        label="Type"
        :model-value="typeFilter"
        :options="typeOptions"
        data-testid="insight-type-filter"
        @update:model-value="setFilter('type', $event)"
      />
      <BaseSelect
        label="Statut"
        :model-value="statusFilter"
        :options="statusOptions"
        @update:model-value="setFilter('status', $event)"
      />
      <BaseSelect
        label="Périmètre"
        :model-value="entityId"
        :options="entityOptions"
        @update:model-value="setFilter('entityId', $event)"
      />
    </div>

    <AsyncBlock
      :loading="insights.loading.value"
      :error="insights.error.value"
      :ready="!!insights.data.value"
      skeleton="card"
      :rows="4"
      error-title="Impossible de charger les analyses IA"
      @retry="insights.run"
    >
      <p class="summary">
        {{ visible.length }} suggestion(s) affichée(s) · {{ openCount }} ouverte(s) au total
      </p>
      <EmptyState
        v-if="visible.length === 0"
        icon="lightbulb"
        title="Aucune suggestion pour ces filtres"
        description="Modifiez les filtres ou lancez une nouvelle analyse."
      />
      <ul v-else class="insights" data-testid="insight-list">
        <li
          v-for="i in visible"
          :id="i.id"
          :key="i.id"
          class="insight"
          :class="`insight--${i.status}`"
          data-testid="insight-item"
          :data-type="i.type"
        >
          <div class="insight__badges">
            <AiProvenanceBadge
              :provenance="i.status === 'resolved' ? 'validated' : 'suggested'"
              size="sm"
              :detail="i.status === 'resolved' ? 'suggestion acceptée' : undefined"
            />
            <StatusBadge
              size="sm"
              tone="neutral"
              :label="AI_INSIGHT_TYPE_LABELS[i.type]"
              icon="tag"
            />
            <StatusBadge
              size="sm"
              :tone="SEVERITY[i.severity].tone"
              :label="SEVERITY[i.severity].label"
            />
            <StatusBadge
              v-if="i.status !== 'open'"
              size="sm"
              :tone="i.status === 'resolved' ? 'success' : 'neutral'"
              :label="STATUS_LABELS[i.status]"
            />
          </div>
          <h2 class="insight__title">{{ i.title }}</h2>
          <p class="insight__meta">
            {{ i.entityId ? labels.entity(i.entityId) : 'Toute l’organisation' }} · détectée le
            {{ formatDateTime(i.createdAt) }}
          </p>
          <div class="insight__why">
            <h3 class="insight__h3">Justification</h3>
            <p>{{ i.description }}</p>
          </div>
          <div
            v-if="
              i.relatedInvoiceIds.length +
              i.relatedTransactionIds.length +
              i.relatedSubscriptionIds.length
            "
            class="insight__pieces"
          >
            <h3 class="insight__h3">Pièces concernées</h3>
            <ul>
              <li v-for="id in i.relatedInvoiceIds" :key="id">
                <RouterLink
                  v-if="auth.can('invoices:read')"
                  :to="{ name: RouteName.InvoiceDetail, params: { invoiceId: id } }"
                >
                  {{ invoiceLabels.get(id) ?? `Facture ${id}` }}
                </RouterLink>
                <span v-else>Facture {{ id }}</span>
              </li>
              <li v-for="id in i.relatedTransactionIds" :key="id">
                <RouterLink
                  v-if="auth.can('transactions:read')"
                  :to="{ name: RouteName.Transactions, query: { search: id } }"
                >
                  Transaction : {{ transactionLabels.get(id) ?? id }}
                </RouterLink>
                <span v-else>Transaction {{ id }}</span>
              </li>
              <li v-for="id in i.relatedSubscriptionIds" :key="id">
                <RouterLink
                  v-if="auth.can('subscriptions:read')"
                  :to="{ name: RouteName.Subscriptions }"
                >
                  Abonnement : {{ subscriptionLabels.get(id) ?? id }}
                </RouterLink>
                <span v-else>Abonnement {{ id }}</span>
              </li>
            </ul>
          </div>
          <p v-if="i.estimatedSavingsCents" class="insight__savings">
            Économie estimée : <strong>{{ formatCents(i.estimatedSavingsCents) }}</strong> par an
            (estimation de l’IA, à vérifier)
          </p>
          <div v-if="i.status === 'open'" class="insight__actions">
            <BaseButton
              size="sm"
              icon="check"
              :loading="deciding === i.id"
              :disabled="deciding !== null"
              data-testid="insight-accept"
              @click="decide(i, 'resolved')"
            >
              Accepter la suggestion
            </BaseButton>
            <BaseButton
              size="sm"
              variant="secondary"
              icon="x"
              :disabled="deciding !== null"
              data-testid="insight-dismiss"
              @click="decide(i, 'dismissed')"
            >
              Ignorer
            </BaseButton>
          </div>
          <p v-else class="insight__decision" data-testid="insight-decision">
            {{ STATUS_LABELS[i.status] }}
            <template v-if="i.decidedByUserId"> par {{ labels.user(i.decidedByUserId) }}</template>
            <template v-if="i.decidedAt"> le {{ formatDateTime(i.decidedAt) }}</template
            >. Aucune modification automatique des données.
          </p>
        </li>
      </ul>
    </AsyncBlock>

    <p class="disclaimer">
      Ces analyses sont produites par un service d’IA (simulé en démonstration) et peuvent être
      erronées. Vérifiez avant d’agir : l’IA ne valide et n’enregistre rien seule.
    </p>
  </div>
</template>

<style scoped>
.page {
  min-width: 0;
}
.block {
  margin-bottom: var(--space-4);
}
.filters {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
  margin: var(--space-2) 0 var(--space-4);
}
@media (min-width: 768px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
}
.insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.insight {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px dashed var(--color-ai-suggested-border);
  border-radius: var(--radius-lg);
  scroll-margin-top: var(--space-16);
}
.insight:target {
  outline: var(--focus-outline, 2px solid var(--color-focus));
  outline-offset: 2px;
}
.insight--resolved,
.insight--dismissed {
  border-style: solid;
  border-color: var(--color-border-subtle);
}
.insight__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.insight__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.insight__meta,
.insight__decision {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.insight__h3 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.insight__pieces ul {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--font-size-sm);
}
.insight__savings {
  font-size: var(--font-size-sm);
}
.insight__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.disclaimer {
  margin-top: var(--space-6);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
