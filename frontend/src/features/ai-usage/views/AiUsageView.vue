<script setup lang="ts">
/**
 * Consommation IA : tokens (entrée / sortie), coût estimé, enregistrements, par fonctionnalité,
 * par jour et par mois ; quota de l'offre de l'organisation (config/plans.ts) avec seuils.
 * Données SIMULÉES, prix par token INDICATIF. Accès : permission `ai-usage:read`.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HorizontalBarChart, TimeSeriesChart, type ChartDatum } from '@/components/charts'
import {
  BaseAlert,
  BaseCard,
  BasePagination,
  BaseSelect,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  ProgressBar,
} from '@/components/ui'
import { useAsync } from '@/composables/useAsync'
import { DEMO_CURRENT_MONTH, DEMO_TODAY } from '@/config/demo'
import { AI_COST_PER_MILLION_TOKENS_CENTS, getPlan } from '@/config/plans'
import { addMonths, formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents } from '@/core/money'
import { AI_FEATURE_LABELS, type AiUsageRecord } from '@/domain'
import { monthRange } from '@/domain/finance'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import AsyncBlock from '@/features/dashboard/components/AsyncBlock.vue'
import { useReferenceLabels } from '@/features/dashboard/composables/useReferenceLabels'
import { monthLabel } from '@/features/dashboard/period'
import {
  formatTokenCount,
  formatTokens,
  usageByDay,
  usageByMonth,
  usageTotals,
} from '../usageStats'

const route = useRoute()
const router = useRouter()
const services = useServices()
const labels = useReferenceLabels()
void labels.load()

const MONTHS = [2, 1, 0].map((back) => addMonths(`${DEMO_CURRENT_MONTH}-01`, -back).slice(0, 7))
const month = computed(() =>
  MONTHS.includes(String(route.query.mois)) ? String(route.query.mois) : DEMO_CURRENT_MONTH,
)
const monthOptions = MONTHS.map((m) => ({ value: m, label: capitalize(monthLabel(m)) }))
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function setMonth(value: string): void {
  page.value = 1
  void router.replace({
    query: { ...route.query, mois: value === DEMO_CURRENT_MONTH ? undefined : value },
  })
}

const org = useAsync(() => services.organization.getCurrentOrganization())
const plan = computed(() => (org.data.value ? getPlan(org.data.value.planId) : null))

const summary = useAsync(() => services.aiUsage.getUsageSummary({ month: month.value }), {
  immediate: false,
})
watch(month, () => void summary.run(), { immediate: true })

/** Tous les enregistrements des mois proposés (pages de 200 lues jusqu'au bout). */
const records = useAsync(async () => {
  const all: AiUsageRecord[] = []
  for (let p = 1; ; p++) {
    const res = await services.aiUsage.listUsage({
      from: `${MONTHS[0]}-01`,
      to: DEMO_TODAY,
      page: p,
      pageSize: 200,
    })
    all.push(...res.items)
    if (all.length >= res.total || res.items.length === 0) return all
  }
})

function reload(): void {
  void summary.run()
  void records.run()
  void org.run()
}

// ── Dérivés pour l'affichage ─────────────────────────────────────────────────────────────────
const monthRecords = computed(() =>
  (records.data.value ?? []).filter((r) => r.date.startsWith(month.value)),
)
const totals = computed(() => usageTotals(monthRecords.value))
const range = computed(() => {
  const r = monthRange(month.value)
  return { start: r.start, end: r.end > DEMO_TODAY ? DEMO_TODAY : r.end }
})
const dailyPoints = computed<ChartDatum[]>(() =>
  usageByDay(monthRecords.value, range.value).map((d) => ({
    key: d.key,
    label: String(Number(d.key.slice(8))),
    fullLabel: formatIsoDate(d.key),
    value: d.totalTokens,
  })),
)
const monthly = computed(() => usageByMonth(records.data.value ?? []))
const monthlyPoints = computed<ChartDatum[]>(() =>
  monthly.value.map((m) => ({
    key: m.key,
    label: capitalize(monthLabel(m.key)),
    value: m.totalTokens,
  })),
)
const featureItems = computed<ChartDatum[]>(() =>
  [...(summary.data.value?.byFeature ?? [])]
    .sort((a, b) => b.tokens - a.tokens)
    .map((f) => ({ key: f.feature, label: AI_FEATURE_LABELS[f.feature], value: f.tokens })),
)

const quota = computed(() => {
  const s = summary.data.value
  if (!s) return null
  const level = s.quotaExceeded ? 'exceeded' : s.quotaUsedBp >= 8_000 ? 'warning' : 'ok'
  return { ...s, level, remaining: Math.max(0, s.includedTokens - s.totalTokens) }
})
const renewal = computed(() => formatIsoDate(addMonths(`${month.value}-01`, 1)))

// ── Journal (pagination côté écran) ───────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const page = ref(1)
const journal = computed(() =>
  monthRecords.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)
const pageCount = computed(() => Math.max(1, Math.ceil(monthRecords.value.length / PAGE_SIZE)))
const columns = [
  { key: 'date', label: 'Date' },
  { key: 'feature', label: 'Fonctionnalité' },
  { key: 'userId', label: 'Utilisateur', hideOnMobile: true },
  { key: 'inputTokens', label: 'Entrée', numeric: true, hideOnMobile: true },
  { key: 'outputTokens', label: 'Sortie', numeric: true, hideOnMobile: true },
  { key: 'total', label: 'Tokens', numeric: true },
  { key: 'costCents', label: 'Coût estimé', numeric: true },
]
</script>

<template>
  <div class="page">
    <PageHeader
      title="Consommation IA"
      description="Tokens consommés, coût estimé et quota de l’offre de votre organisation."
    >
      <template #actions>
        <BaseSelect
          label="Mois"
          :model-value="month"
          :options="monthOptions"
          @update:model-value="setMonth"
        />
      </template>
    </PageHeader>

    <BaseAlert tone="info" title="Données simulées, prix indicatifs" class="block">
      En démonstration, aucun service d’IA réel n’est appelé : la consommation est fictive. Le coût
      est estimé au prix indicatif de
      {{ formatCents(AI_COST_PER_MILLION_TOKENS_CENTS) }} par million de tokens (valeur non
      validée), sans lien avec le crédit réel du projet.
    </BaseAlert>

    <AsyncBlock
      :loading="summary.loading.value"
      :error="summary.error.value"
      :ready="!!summary.data.value"
      skeleton="kpi"
      error-title="Impossible de charger la consommation IA"
      @retry="reload"
    >
      <template v-if="quota">
        <BaseCard class="block" data-testid="ai-quota">
          <template #header>
            <h2 class="quota__title">Quota de tokens du mois</h2>
            <p class="quota__plan">
              Offre <strong>{{ plan?.name ?? '…' }}</strong> ·
              {{ formatTokens(quota.includedTokens) }} inclus par mois · renouvellement le
              {{ renewal }} ·
              <RouterLink :to="{ name: RouteName.Landing, hash: '#offres' }">
                Comparer les offres
              </RouterLink>
            </p>
          </template>
          <ProgressBar
            :label="`Quota IA de ${monthLabel(month)}`"
            :value="quota.totalTokens"
            :max="quota.includedTokens"
            :value-text="`${formatTokens(quota.totalTokens)} sur ${formatTokenCount(quota.includedTokens)}`"
            :warning-at="80"
            :danger-at="100"
          />
          <BaseAlert
            v-if="quota.level === 'exceeded'"
            tone="danger"
            title="Quota IA dépassé"
            class="quota__alert"
            data-testid="quota-exceeded"
          >
            Le quota de votre offre est atteint pour ce mois.
            <template v-if="plan?.aiHardLimit">
              À 100 %, les fonctions IA sont suspendues jusqu’au renouvellement ; la saisie manuelle
              reste disponible.
            </template>
          </BaseAlert>
          <BaseAlert
            v-else-if="quota.level === 'warning'"
            tone="warning"
            title="Seuil d’alerte atteint (80 %)"
            class="quota__alert"
          >
            Il reste {{ formatTokens(quota.remaining) }} ce mois-ci.
          </BaseAlert>
          <p v-else class="quota__ok">
            {{ formatBasisPoints(quota.quotaUsedBp) }} du quota utilisés · il reste
            {{ formatTokens(quota.remaining) }}. Alerte à 80 %, blocage à 100 %.
          </p>
        </BaseCard>

        <div class="kpis">
          <KpiCard
            label="Tokens consommés"
            :value="formatTokenCount(quota.totalTokens)"
            icon="bolt"
            data-testid="ai-tokens"
            :hint="`Entrée : ${formatTokenCount(totals.inputTokens)} · sortie : ${formatTokenCount(totals.outputTokens)}`"
          />
          <KpiCard
            label="Coût estimé (indicatif)"
            :value="formatCents(quota.totalCostCents)"
            icon="wallet"
            hint="Coût estimé, fictif en démonstration."
          />
          <KpiCard
            label="Appels IA enregistrés"
            :value="String(totals.records)"
            icon="chart"
            hint="Un enregistrement regroupe les appels d’un jour, d’un utilisateur et d’une fonctionnalité."
          />
          <KpiCard
            label="Quota utilisé"
            :value="formatBasisPoints(quota.quotaUsedBp)"
            icon="target"
            :hint="`de ${formatTokens(quota.includedTokens)}`"
          />
        </div>
      </template>
    </AsyncBlock>

    <EmptyState
      v-if="summary.data.value && summary.data.value.totalTokens === 0"
      icon="bolt"
      title="Aucune utilisation de l’IA ce mois-ci"
      description="Choisissez un autre mois."
    />

    <div v-if="summary.data.value" class="grid">
      <BaseCard title="Par fonctionnalité" :description="`Tokens, ${monthLabel(month)}.`">
        <HorizontalBarChart
          title="Tokens par fonctionnalité"
          :items="featureItems"
          :format="formatTokens"
          value-label="Tokens"
        />
        <ul class="costs">
          <li v-for="f in summary.data.value.byFeature" :key="f.feature">
            {{ AI_FEATURE_LABELS[f.feature] }} : coût estimé {{ formatCents(f.costCents) }}
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Par mois" description="Tokens consommés par mois (données disponibles).">
        <AsyncBlock
          :loading="records.loading.value"
          :error="records.error.value"
          :ready="!!records.data.value"
          compact
          @retry="records.run"
        >
          <HorizontalBarChart
            title="Tokens par mois"
            :items="monthlyPoints"
            :format="formatTokens"
            value-label="Tokens"
          />
        </AsyncBlock>
      </BaseCard>

      <BaseCard
        title="Par jour"
        :description="`Tokens par jour, ${monthLabel(month)}.`"
        class="wide"
      >
        <AsyncBlock
          :loading="records.loading.value"
          :error="records.error.value"
          :ready="!!records.data.value"
          compact
          @retry="records.run"
        >
          <TimeSeriesChart
            title="Tokens consommés par jour"
            :points="dailyPoints"
            variant="column"
            :format="formatTokens"
            :format-tick="formatTokenCount"
            value-label="Tokens"
            period-label="Jour"
          />
        </AsyncBlock>
      </BaseCard>

      <BaseCard title="Journal de consommation" class="wide" flush>
        <DataTable
          :columns="columns"
          :rows="journal"
          row-key="id"
          caption="Journal de consommation IA du mois"
        >
          <template #cell-date="{ row }">{{ formatIsoDate(row.date) }}</template>
          <template #cell-feature="{ row }">{{ AI_FEATURE_LABELS[row.feature] }}</template>
          <template #cell-userId="{ row }">{{ labels.user(row.userId) }}</template>
          <template #cell-inputTokens="{ row }">{{ formatTokenCount(row.inputTokens) }}</template>
          <template #cell-outputTokens="{ row }">{{ formatTokenCount(row.outputTokens) }}</template>
          <template #cell-total="{ row }">
            {{ formatTokenCount(row.inputTokens + row.outputTokens) }}
          </template>
          <template #cell-costCents="{ row }">{{ formatCents(row.costCents) }}</template>
          <template #empty>
            <EmptyState compact title="Aucune consommation ce mois-ci" />
          </template>
        </DataTable>
        <div class="pager">
          <BasePagination
            v-model:page="page"
            :page-count="pageCount"
            :total="monthRecords.length"
            item-label="enregistrements"
          />
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-width: 0;
}
.block {
  margin-bottom: var(--space-4);
}
.quota__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.quota__plan {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}
.quota__alert {
  margin-top: var(--space-4);
}
.quota__ok {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.kpis {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
  margin-bottom: var(--space-6);
}
@media (min-width: 640px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wide {
    grid-column: 1 / -1;
  }
}
.costs {
  margin: var(--space-4) 0 0;
  padding-left: var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.pager {
  padding: var(--space-3) var(--space-4);
}
</style>
