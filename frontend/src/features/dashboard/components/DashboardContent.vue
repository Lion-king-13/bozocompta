<script setup lang="ts">
/**
 * Contenu commun des tableaux de bord organisation (entityId = null) et entité.
 *
 * Sources des chiffres :
 * - dépenses et ventilations : `dashboard.getSummary` → `SpendReport` (calcul unique) ;
 * - compteurs « À traiter » : la MÊME méthode de service que la liste cible (actionCounters.ts) ;
 * - budgets et échéances : la synthèse (mêmes calculs que les écrans Budgets et Abonnements).
 * Aucune somme de dépenses n'est refaite ici.
 */
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { HorizontalBarChart, StackedBar, TimeSeriesChart } from '@/components/charts'
import {
  AiProvenanceBadge,
  BaseCard,
  BaseIcon,
  EmptyState,
  KpiCard,
  ProgressBar,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { DEMO_CURRENT_MONTH, DEMO_TODAY } from '@/config/demo'
import { daysBetween, formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents, sumCents } from '@/core/money'
import { AI_INSIGHT_TYPE_LABELS } from '@/domain'
import { monthlyEquivalentCents } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { consumedText, remainingText } from '@/features/budgets/budgetLevel'
import { ACTION_COUNTERS } from '../actionCounters'
import { entityBars, entityShare, monthlyPoints, spendBreakdowns } from '../dashboardCharts'
import { monthLabel, periodFromQuery } from '../period'
import type { ReferenceLabels } from '../composables/useReferenceLabels'
import AsyncBlock from './AsyncBlock.vue'

const props = defineProps<{ entityId: string | null; labels: ReferenceLabels }>()

const services = useServices()
const auth = useAuthStore()
const route = useRoute()
const period = computed(() => periodFromQuery(route.query).range)

// ── Synthèse (dépenses, budgets, échéances) ───────────────────────────────────────────────
const summary = useAsync(
  () => services.dashboard.getSummary({ entityId: props.entityId, period: period.value }),
  { immediate: false },
)

// ── Compteurs « À traiter » : un appel par liste, seulement si le rôle voit la liste ───────
const counters = ACTION_COUNTERS.filter((def) => auth.can(def.permission)).map((def) => ({
  def,
  state: useAsync(() => def.count(services, props.entityId), { immediate: false }),
}))

const subscriptions = useAsync(
  () =>
    services.subscriptions.listSubscriptions(props.entityId ? { entityId: props.entityId } : {}),
  { immediate: false },
)
const insights = useAsync(
  () =>
    services.aiInsights.listInsights({
      status: 'open',
      ...(props.entityId ? { entityId: props.entityId } : {}),
    }),
  { immediate: false },
)

function loadScoped(): void {
  counters.forEach((c) => void c.state.run())
  if (auth.can('subscriptions:read')) void subscriptions.run()
  if (auth.can('ai-insights:read')) void insights.run()
}

watch(
  () => [props.entityId, period.value.start, period.value.end],
  () => void summary.run(),
  { immediate: true },
)
watch(() => props.entityId, loadScoped, { immediate: true })

// ── Données dérivées (formatage et libellés uniquement) ────────────────────────────────────
const spend = computed(() => summary.data.value?.spend ?? null)
const scopeQuery = computed(() => (props.entityId ? { entityId: props.entityId } : {}))
const charts = computed(() => (spend.value ? spendBreakdowns(spend.value, props.labels) : null))
const months = computed(() => (spend.value ? monthlyPoints(spend.value, period.value) : []))
const entityIds = computed(() =>
  props.entityId ? [props.entityId] : props.labels.entities.value.map((e) => e.id),
)
const bars = computed(() =>
  spend.value ? entityBars(spend.value, entityIds.value, props.labels) : [],
)
const share = computed(() => (spend.value ? entityShare(spend.value, props.labels) : []))

const budgets = computed(() =>
  [...(summary.data.value?.budgets ?? [])].sort((a, b) => b.consumedBp - a.consumedBp),
)
const exceededBudgets = computed(() => budgets.value.filter((b) => b.overBudget).length)
const dues = computed(() => summary.data.value?.upcomingDues ?? [])
const activeSubscriptions = computed(() =>
  (subscriptions.data.value ?? []).filter((s) => s.status === 'active'),
)
const subscriptionsMonthly = computed(() =>
  sumCents(activeSubscriptions.value.map(monthlyEquivalentCents)),
)

function dueBadge(dueDate: string, overdue: boolean) {
  if (overdue) return { tone: 'danger' as const, label: 'En retard', icon: 'alert-circle' as const }
  const days = daysBetween(DEMO_TODAY, dueDate)
  if (days <= 7)
    return { tone: 'warning' as const, label: `Dans ${days} j`, icon: 'calendar' as const }
  return { tone: 'neutral' as const, label: `Dans ${days} j`, icon: 'calendar' as const }
}

const fmt = (cents: number) => formatCents(cents)
</script>

<template>
  <div class="dash">
    <!-- À traiter : chaque compteur = longueur de la liste ciblée par le lien -->
    <section v-if="counters.length" aria-labelledby="todo-title" class="dash__section">
      <h2 id="todo-title" class="dash__h2">À traiter</h2>
      <ul class="dash__counters">
        <li v-for="c in counters" :key="c.def.id">
          <RouterLink
            class="counter"
            :to="{ name: c.def.route, query: c.def.query(entityId) }"
            :data-testid="`counter-${c.def.id}`"
          >
            <span class="counter__icon"><BaseIcon :name="c.def.icon" :size="18" /></span>
            <span class="counter__text">
              <span
                v-if="c.state.data.value !== null"
                class="counter__value"
                data-testid="counter-value"
              >
                {{ c.state.data.value }}
              </span>
              <span v-else-if="c.state.error.value" class="counter__value counter__value--error">
                —
              </span>
              <span v-else class="counter__value counter__value--loading">…</span>
              <span class="counter__label">{{ c.def.label }}</span>
              <span v-if="c.state.error.value" class="counter__error">
                Indisponible ({{ c.state.error.value.message }})
              </span>
            </span>
            <BaseIcon name="chevron-right" :size="18" class="counter__chevron" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- Indicateurs clés -->
    <section aria-labelledby="kpi-title" class="dash__section">
      <h2 id="kpi-title" class="dash__h2">Indicateurs de la période</h2>
      <AsyncBlock
        :loading="summary.loading.value"
        :error="summary.error.value"
        :ready="!!summary.data.value"
        skeleton="kpi"
        error-title="Impossible de charger le tableau de bord"
        @retry="summary.run"
      >
        <div v-if="summary.data.value && spend" class="dash__kpis" data-testid="dashboard-summary">
          <RouterLink
            v-if="entityId === null"
            class="kpi-link"
            :to="{
              name: RouteName.Transactions,
              query: { direction: 'debit', bookedFrom: period.start, bookedTo: period.end },
            }"
            data-testid="kpi-spend"
          >
            <KpiCard
              label="Dépenses totales (consolidé)"
              :value="fmt(spend.imputedTotalCents)"
              icon="wallet"
              data-testid="spend-total"
              :hint="`${spend.transactionCount} transaction(s) de débit, chacune comptée une seule fois`"
            />
          </RouterLink>
          <RouterLink
            v-else
            class="kpi-link"
            :to="{ name: RouteName.Allocations, query: scopeQuery }"
            data-testid="kpi-spend"
          >
            <KpiCard
              label="Dépenses imputées à l'entité"
              :value="fmt(spend.imputedTotalCents)"
              icon="wallet"
              data-testid="entity-imputed"
            >
              Payées par l'entité (information) :
              <strong data-testid="entity-paid">{{ fmt(spend.paidTotalCents) }}</strong>
            </KpiCard>
          </RouterLink>

          <RouterLink
            v-if="auth.can('budgets:read')"
            class="kpi-link"
            :to="{ name: RouteName.Budgets, query: scopeQuery }"
            data-testid="kpi-budgets"
          >
            <KpiCard
              label="Budgets dépassés"
              :value="`${exceededBudgets} sur ${budgets.length}`"
              icon="target"
              :hint="`Budgets de ${monthLabel(DEMO_CURRENT_MONTH)} (mois de démonstration)`"
            />
          </RouterLink>

          <RouterLink
            v-if="auth.can('subscriptions:read')"
            class="kpi-link"
            :to="{ name: RouteName.Subscriptions, query: scopeQuery }"
            data-testid="kpi-subscriptions"
          >
            <KpiCard
              label="Abonnements actifs"
              :value="subscriptions.data.value ? String(activeSubscriptions.length) : '…'"
              icon="repeat"
              :hint="`Équivalent mensuel : ${fmt(subscriptionsMonthly)}`"
            />
          </RouterLink>

          <RouterLink
            v-if="auth.can('subscriptions:read')"
            class="kpi-link"
            :to="{ name: RouteName.Subscriptions, query: { ...scopeQuery, onglet: 'echeances' } }"
            data-testid="kpi-dues"
          >
            <KpiCard
              label="Échéances à 30 jours"
              :value="String(dues.length)"
              icon="calendar"
              :hint="`Total : ${fmt(sumCents(dues.map((d) => d.amountCents)))} (renouvellements et factures à payer)`"
            />
          </RouterLink>
        </div>
      </AsyncBlock>
    </section>

    <EmptyState
      v-if="spend && spend.transactionCount === 0"
      icon="inbox"
      title="Aucune dépense sur cette période"
      description="Choisissez une autre période, ou importez des transactions CSV et des factures PDF."
    />

    <div v-if="spend && charts" class="dash__grid">
      <!-- Organisation : dépenses par entité ; entité : les deux lectures -->
      <BaseCard
        :title="entityId ? 'Imputé à l’entité / payé par l’entité' : 'Dépenses par entité'"
        :description="
          entityId
            ? 'Lecture principale : imputé à. Information secondaire : payé par.'
            : 'Barre pleine : imputé à. Barre hachurée : payé par.'
        "
        class="dash__wide"
      >
        <HorizontalBarChart
          :title="entityId ? 'Imputé à / payé par l’entité' : 'Dépenses par entité'"
          :items="bars"
        />
        <p v-if="!entityId" class="dash__total" data-testid="consolidated-total">
          Total consolidé : <strong>{{ fmt(spend.imputedTotalCents) }}</strong>, compté une seule
          fois.
        </p>
        <p class="dash__note">
          Les imputations analytiques répartissent les dépenses sans les dupliquer : la somme des
          montants « imputé à » des entités, comme celle des montants « payé par », égale le total
          consolidé.
          <template v-if="entityId">
            « Payé par » = paiements faits avec une carte ou un compte de l’entité ; « imputé à » =
            part des dépenses ventilée sur l’entité, y compris des paiements d’une autre entité.
          </template>
        </p>
        <div v-if="!entityId" class="dash__share">
          <h3 class="dash__h3">Répartition du total consolidé (imputé à)</h3>
          <StackedBar title="Répartition du total consolidé par entité" :items="share" />
        </div>
      </BaseCard>

      <BaseCard
        title="Évolution mensuelle"
        description="Dépenses imputées, par mois de la période."
        class="dash__wide"
      >
        <TimeSeriesChart
          title="Évolution mensuelle des dépenses imputées"
          :points="months"
          variant="line"
          period-label="Mois"
        />
      </BaseCard>

      <BaseCard title="Par catégorie">
        <HorizontalBarChart title="Dépenses par catégorie" :items="charts.byCategory" />
      </BaseCard>

      <BaseCard title="Par département et projet" description="Centres de coûts (imputé à).">
        <HorizontalBarChart title="Dépenses par centre de coûts" :items="charts.byCostCenter" />
      </BaseCard>

      <BaseCard title="Par collaborateur" description="Porteur de la carte utilisée.">
        <HorizontalBarChart title="Dépenses par collaborateur" :items="charts.byUser" />
      </BaseCard>

      <BaseCard title="Par carte">
        <HorizontalBarChart title="Dépenses par carte" :items="charts.byCard" />
      </BaseCard>
    </div>

    <div v-if="summary.data.value" class="dash__grid">
      <BaseCard
        v-if="auth.can('budgets:read')"
        title="Budgets du mois"
        :description="`Consommé sur l’imputé, ${monthLabel(DEMO_CURRENT_MONTH)}.`"
      >
        <template #actions>
          <RouterLink :to="{ name: RouteName.Budgets, query: scopeQuery }"
            >Tous les budgets</RouterLink
          >
        </template>
        <p v-if="budgets.length === 0" class="dash__muted">Aucun budget pour ce mois.</p>
        <ul v-else class="dash__list">
          <li v-for="b in budgets.slice(0, 4)" :key="b.budget.id" data-testid="dashboard-budget">
            <ProgressBar
              :label="b.budget.label"
              :value="b.consumedCents"
              :max="b.budget.amountCents"
              :value-text="consumedText(b)"
            />
            <p class="dash__budget-meta">{{ remainingText(b) }}</p>
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        v-if="auth.can('subscriptions:read')"
        title="Abonnements et prochaines échéances"
        description="30 prochains jours, factures en retard incluses."
      >
        <template #actions>
          <RouterLink
            :to="{ name: RouteName.Subscriptions, query: { ...scopeQuery, onglet: 'echeances' } }"
          >
            Toutes les échéances
          </RouterLink>
        </template>
        <p v-if="dues.length === 0" class="dash__muted">Aucune échéance à venir.</p>
        <ul v-else class="dash__list dash__dues">
          <li v-for="d in dues.slice(0, 5)" :key="d.kind + d.sourceId + d.dueDate">
            <div>
              <p class="dash__due-label">{{ d.label }}</p>
              <p class="dash__muted">
                {{ d.kind === 'invoice_due' ? 'Facture à payer' : 'Renouvellement' }} ·
                {{ formatIsoDate(d.dueDate) }}
              </p>
            </div>
            <div class="dash__due-right">
              <span class="tabular-nums">{{ fmt(d.amountCents) }}</span>
              <StatusBadge size="sm" v-bind="dueBadge(d.dueDate, d.overdue)" />
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        v-if="auth.can('ai-insights:read')"
        title="Anomalies et suggestions IA"
        description="L’IA propose, vous décidez : rien n’est appliqué automatiquement."
        class="dash__wide"
      >
        <template #actions>
          <RouterLink
            :to="{ name: RouteName.AiInsights, query: { status: 'open', ...scopeQuery } }"
          >
            Toutes les analyses
          </RouterLink>
        </template>
        <AsyncBlock
          :loading="insights.loading.value"
          :error="insights.error.value"
          :ready="!!insights.data.value"
          compact
          error-title="Suggestions IA indisponibles"
          @retry="insights.run"
        >
          <p v-if="insights.data.value?.length === 0" class="dash__muted">
            Aucune suggestion ouverte.
          </p>
          <ul v-else class="dash__list">
            <li v-for="i in insights.data.value?.slice(0, 3)" :key="i.id" class="dash__insight">
              <div class="dash__insight-badges">
                <AiProvenanceBadge provenance="suggested" size="sm" />
                <StatusBadge size="sm" tone="neutral" :label="AI_INSIGHT_TYPE_LABELS[i.type]" />
              </div>
              <p class="dash__due-label">{{ i.title }}</p>
              <p v-if="i.estimatedSavingsCents" class="dash__muted">
                Économie estimée : {{ fmt(i.estimatedSavingsCents) }} par an
              </p>
              <RouterLink :to="{ name: RouteName.AiInsights, hash: `#${i.id}` }">
                Examiner la suggestion
              </RouterLink>
            </li>
          </ul>
        </AsyncBlock>
        <p v-if="auth.can('ai-usage:read')" class="dash__note">
          Quota IA du mois utilisé :
          {{ formatBasisPoints(summary.data.value.aiUsage.quotaUsedBp) }} —
          <RouterLink :to="{ name: RouteName.AiUsage }">voir la consommation IA</RouterLink>
        </p>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}
.dash__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dash__h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.dash__h3 {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-3);
}
.dash__counters,
.dash__kpis {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .dash__counters,
  .dash__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .dash__counters,
  .dash__kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.counter {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  text-decoration: none;
}
.counter:hover {
  border-color: var(--color-primary-border);
  background: var(--color-surface-hover);
}
.counter__icon {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.counter__text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.counter__value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  line-height: var(--line-height-tight);
}
.counter__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.counter__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger-text);
}
.counter__chevron {
  color: var(--color-text-secondary);
}
.kpi-link {
  display: block;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-lg);
}
.kpi-link:hover :deep(.kpi) {
  border-color: var(--color-primary-border);
}
.dash__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .dash__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dash__wide {
    grid-column: 1 / -1;
  }
}
.dash__total {
  margin-top: var(--space-4);
  font-size: var(--font-size-md);
}
.dash__note,
.dash__muted {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.dash__note {
  margin-top: var(--space-3);
}
.dash__share {
  margin-top: var(--space-5);
}
.dash__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.dash__budget-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.dash__dues li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.dash__due-label {
  font-weight: var(--font-weight-medium);
}
.dash__due-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}
.dash__insight {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.dash__insight-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
