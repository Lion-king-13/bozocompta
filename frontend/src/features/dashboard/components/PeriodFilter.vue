<script setup lang="ts">
/**
 * Choix de la période d'un tableau de bord. La période est conservée dans l'URL
 * (`?periode=mois|trimestre|annee|perso&du=AAAA-MM-JJ&au=AAAA-MM-JJ`) : un rechargement
 * ou un lien partagé affiche les mêmes chiffres.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BaseButton, BaseSelect, BaseTextField } from '@/components/ui'
import { DEMO_TODAY } from '@/config/demo'
import { formatIsoDate } from '@/core/dates/dates'
import {
  PERIOD_OPTIONS,
  describeRange,
  parseFrenchDate,
  periodFromQuery,
  type PeriodPreset,
} from '../period'

const route = useRoute()
const router = useRouter()
const current = computed(() => periodFromQuery(route.query))

// Saisie texte JJ/MM/AAAA (QA-23) : un champ date natif suit la langue du navigateur
// (mm/dd/yyyy dans un Chromium anglais), le texte reste identique partout.
const preset = ref<PeriodPreset>(current.value.preset)
const from = ref(formatIsoDate(current.value.range.start))
const to = ref(formatIsoDate(current.value.range.end))
const error = ref<string | undefined>()

watch(current, (c) => {
  preset.value = c.preset
  from.value = formatIsoDate(c.range.start)
  to.value = formatIsoDate(c.range.end)
})

function onPreset(value: string): void {
  preset.value = value as PeriodPreset
  error.value = undefined
  if (value === 'perso') return
  void router.replace({ query: { ...route.query, periode: value, du: undefined, au: undefined } })
}

function applyCustom(): void {
  const start = parseFrenchDate(from.value)
  const end = parseFrenchDate(to.value)
  if (!start || !end) {
    error.value = 'Saisissez deux dates valides au format jj/mm/aaaa.'
    return
  }
  if (start > end) {
    error.value = 'La date de début doit précéder la date de fin.'
    return
  }
  error.value = undefined
  void router.replace({ query: { ...route.query, periode: 'perso', du: start, au: end } })
}

const options = PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
</script>

<template>
  <div class="period" data-testid="period-filter">
    <div class="period__controls">
      <BaseSelect
        label="Période"
        :model-value="preset"
        :options="options"
        data-testid="period-select"
        @update:model-value="onPreset"
      />
      <form v-if="preset === 'perso'" class="period__custom" @submit.prevent="applyCustom">
        <BaseTextField
          v-model="from"
          label="Du"
          placeholder="jj/mm/aaaa"
          inputmode="numeric"
          hint="jj/mm/aaaa"
          :error="error"
        />
        <BaseTextField
          v-model="to"
          label="Au"
          placeholder="jj/mm/aaaa"
          inputmode="numeric"
          hint="jj/mm/aaaa"
        />
        <BaseButton type="submit" variant="secondary">Appliquer</BaseButton>
      </form>
    </div>
    <p class="period__note" data-testid="period-description">
      Dépenses {{ describeRange(current.range) }} · date de démonstration figée au
      {{ formatIsoDate(DEMO_TODAY) }}
    </p>
  </div>
</template>

<style scoped>
.period {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.period__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}
.period__controls > :first-child {
  min-width: min(100%, 14rem);
}
.period__custom {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}
.period__note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
