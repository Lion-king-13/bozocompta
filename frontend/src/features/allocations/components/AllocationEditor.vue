<script setup lang="ts">
/**
 * Éditeur de répartition d'une transaction : lignes (entité obligatoire + centre de coûts
 * facultatif + pourcentage), montants dérivés EN DIRECT, total, reste à imputer et barre
 * empilée. Les lignes sont un v-model ; le parent enregistre via le service.
 */
import { computed } from 'vue'
import {
  BaseButton,
  BaseIcon,
  BaseSelect,
  BaseTextField,
  StatusBadge,
  type SelectOption,
} from '@/components/ui'
import { formatBasisPoints, formatCents } from '@/core/money'
import type { Cents, CostCenter, Id, LegalEntity } from '@/domain'
import { previewAllocation, splitLinesEvenly, type AllocationLineForm } from '../allocationEditor'

const lines = defineModel<AllocationLineForm[]>('lines', { required: true })

const props = defineProps<{
  amountCents: Cents
  entities: LegalEntity[]
  costCenters: CostCenter[]
  entityName: (id: Id) => string
  readonly?: boolean
}>()

const preview = computed(() => previewAllocation(props.amountCents, lines.value))

const entityOptions = computed<SelectOption[]>(() =>
  props.entities.map((e) => ({ value: e.id, label: props.entityName(e.id) })),
)

/** Centres de coûts proposés pour une ligne : ceux de l'entité choisie, actifs (+ la valeur actuelle). */
function costCenterOptions(line: AllocationLineForm): SelectOption[] {
  const list = props.costCenters.filter(
    (c) => c.entityId === line.entityId && (c.active || c.id === line.costCenterId),
  )
  return [
    { value: '', label: 'Aucun (entité seule)' },
    ...list.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.type === 'project' ? 'projet' : 'département'})`,
    })),
  ]
}

function onEntityChange(line: AllocationLineForm) {
  // Un centre de coûts appartient à UNE entité : on le retire s'il ne correspond plus.
  const cc = props.costCenters.find((c) => c.id === line.costCenterId)
  if (cc && cc.entityId !== line.entityId) line.costCenterId = ''
}

function addLine() {
  lines.value.push({ entityId: '', costCenterId: '', percent: '' })
}
function removeLine(index: number) {
  lines.value.splice(index, 1)
}
function splitEvenly() {
  lines.value = splitLinesEvenly(lines.value)
}

/** Couleur constante par entité (Belgique = série 1, France = série 2 sur tous les écrans). */
function entityColor(entityId: Id): string {
  const country = props.entities.find((e) => e.id === entityId)?.country
  return country === 'FR'
    ? 'var(--chart-cat-2)'
    : country === 'BE'
      ? 'var(--chart-cat-1)'
      : 'var(--chart-other)'
}

function amountText(index: number): string {
  const amount = preview.value.lines[index]?.amountCents
  return amount === null || amount === undefined ? '—' : formatCents(amount)
}

function lineLabel(line: AllocationLineForm): string {
  const cc = props.costCenters.find((c) => c.id === line.costCenterId)
  const entity = line.entityId ? props.entityName(line.entityId) : 'Entité à choisir'
  return cc ? `${entity} — ${cc.name}` : entity
}
</script>

<template>
  <div class="editor" data-testid="allocation-editor">
    <ol class="editor__lines">
      <li
        v-for="(line, index) in lines"
        :key="index"
        class="editor__line"
        data-testid="allocation-line"
      >
        <span
          class="editor__swatch"
          :style="{ background: entityColor(line.entityId) }"
          aria-hidden="true"
        />
        <BaseSelect
          v-model="line.entityId"
          :label="`Imputé à — entité (ligne ${index + 1})`"
          :options="entityOptions"
          placeholder="Choisir une entité"
          required
          :disabled="readonly"
          @update:model-value="onEntityChange(line)"
        />
        <BaseSelect
          v-model="line.costCenterId"
          :label="`Centre de coûts (ligne ${index + 1})`"
          :options="costCenterOptions(line)"
          :disabled="readonly || !line.entityId"
        />
        <BaseTextField
          v-model="line.percent"
          :label="`Part (ligne ${index + 1})`"
          inputmode="decimal"
          suffix="%"
          :readonly="readonly"
          :error="preview.lineErrors[index]"
        />
        <div class="editor__amount">
          <span class="editor__amount-label">Montant</span>
          <output class="tabular-nums" data-testid="allocation-amount">
            {{ amountText(index) }}
          </output>
        </div>
        <div v-if="!readonly" class="editor__remove">
          <BaseButton
            variant="ghost"
            size="sm"
            icon="trash"
            :disabled="lines.length === 1"
            :aria-label="`Supprimer l'imputation ${index + 1}`"
            @click="removeLine(index)"
          />
        </div>
      </li>
    </ol>

    <div v-if="!readonly" class="editor__tools">
      <BaseButton variant="secondary" size="sm" icon="plus" @click="addLine"
        >Ajouter une imputation</BaseButton
      >
      <BaseButton
        variant="ghost"
        size="sm"
        icon="split"
        :disabled="lines.length < 2"
        @click="splitEvenly"
        >Répartir à parts égales</BaseButton
      >
    </div>

    <dl class="editor__totals" aria-live="polite">
      <div>
        <dt>Total imputé</dt>
        <dd class="tabular-nums" data-testid="allocation-total">
          {{ formatBasisPoints(preview.totalBp) }} ·
          {{ preview.allocatedCents !== null ? formatCents(preview.allocatedCents) : '—' }}
        </dd>
        <dd>
          <StatusBadge
            v-if="preview.totalBp === 10000 && !preview.blockingReason"
            tone="success"
            label="Total conforme"
            icon="check"
            size="sm"
            data-testid="allocation-status"
          />
          <StatusBadge
            v-else
            tone="danger"
            label="Total incorrect"
            icon="alert-circle"
            size="sm"
            data-testid="allocation-status"
          />
        </dd>
      </div>
      <div>
        <dt>Reste à imputer</dt>
        <dd class="tabular-nums" data-testid="allocation-remaining">
          <template v-if="preview.remainingBp >= 0">
            {{ preview.remainingCents !== null ? formatCents(preview.remainingCents) : '—' }}
            ({{ formatBasisPoints(preview.remainingBp) }})
          </template>
          <template v-else>Excédent de {{ formatBasisPoints(-preview.remainingBp) }}</template>
        </dd>
      </div>
    </dl>

    <figure v-if="preview.totalBp > 0" class="editor__chart">
      <div
        class="bar"
        role="img"
        :aria-label="`Répartition : ${lines.map((l) => `${lineLabel(l)} ${l.percent || 0} %`).join(', ')}`"
      >
        <template v-for="(line, index) in lines" :key="index">
          <span
            v-if="(preview.lines[index]?.percentBp ?? 0) > 0"
            class="bar__segment"
            :style="{
              flexGrow: preview.lines[index]?.percentBp ?? 0,
              background: entityColor(line.entityId),
            }"
          />
        </template>
        <span
          v-if="preview.remainingBp > 0"
          class="bar__segment bar__segment--rest"
          :style="{ flexGrow: preview.remainingBp }"
        />
      </div>
      <figcaption class="bar__legend">
        <span v-for="(line, index) in lines" :key="index" class="bar__legend-item">
          <span
            class="editor__swatch"
            :style="{ background: entityColor(line.entityId) }"
            aria-hidden="true"
          />
          {{ lineLabel(line) }} : {{ line.percent || 0 }} %
        </span>
        <span v-if="preview.remainingBp > 0" class="bar__legend-item">
          <BaseIcon name="minus" :size="14" /> Reste à imputer
        </span>
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.editor__lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.editor__line {
  position: relative;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-5);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}
.editor__line > :nth-child(2),
.editor__line > :nth-child(3) {
  grid-column: 1 / -1;
}
.editor__swatch {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.editor__line > .editor__swatch {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0.375rem;
  height: auto;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}
.editor__amount {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.editor__amount-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.editor__amount output {
  min-height: var(--control-height);
  display: flex;
  align-items: center;
  font-weight: var(--font-weight-semibold);
}
.editor__remove {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}
@media (min-width: 768px) {
  .editor__line {
    grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) minmax(7rem, 1fr) auto;
    align-items: start;
  }
  .editor__line > :nth-child(2),
  .editor__line > :nth-child(3) {
    grid-column: auto;
  }
  .editor__remove {
    grid-column: auto;
    padding-top: 1.6rem;
  }
}
.editor__tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.editor__totals {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}
.editor__totals div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
}
.editor__totals dt {
  min-width: 9rem;
  font-weight: var(--font-weight-semibold);
}
.editor__totals dd {
  margin: 0;
}
.editor__chart {
  margin: 0;
}
.bar {
  display: flex;
  height: 1.25rem;
  border-radius: var(--radius-sm);
  overflow: hidden;
  gap: 2px;
  background: var(--color-surface);
}
.bar__segment {
  flex-basis: 0;
  min-width: 2px;
}
.bar__segment--rest {
  background: repeating-linear-gradient(
    45deg,
    var(--color-surface-sunken),
    var(--color-surface-sunken) 4px,
    var(--color-border) 4px,
    var(--color-border) 6px
  );
}
.bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.bar__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
</style>
