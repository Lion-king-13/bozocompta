<script setup lang="ts">
/**
 * Liste déroulante native (<select>) : accessible et adaptée au mobile sans effort.
 * Utilisation : <BaseSelect v-model="entityId" label="Entité" :options="entityOptions" />
 */
import { computed, useId } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { SelectOption } from './types'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    options: SelectOption[]
    /** Première option vide, non sélectionnable une fois un choix fait. */
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    /** Masque visuellement le libellé (il reste lu par les lecteurs d'écran). */
    hideLabel?: boolean
  }>(),
  { placeholder: undefined, hint: undefined, error: undefined },
)

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`
const describedBy = computed(
  () =>
    [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined,
)
</script>

<template>
  <div class="field" :class="{ 'field--invalid': !!error }">
    <label class="field__label" :class="{ 'sr-only': hideLabel }" :for="id">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(obligatoire)</span>
    </label>

    <div class="field__control">
      <select
        :id="id"
        v-model="model"
        class="field__select"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <BaseIcon class="field__chevron" name="chevron-down" :size="18" />
    </div>

    <p v-if="hint" :id="hintId" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error">
      <BaseIcon name="alert-circle" :size="16" />
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.field__required {
  color: var(--color-danger-text);
  margin-left: 2px;
}

.field__control {
  position: relative;
}

.field__select {
  width: 100%;
  min-height: var(--control-height);
  padding: 0 var(--space-10) 0 var(--space-3);
  appearance: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.field__select:hover {
  border-color: var(--color-border-strong);
}

.field__select:focus-visible {
  outline: none;
  border-color: var(--color-focus);
  box-shadow: 0 0 0 1px var(--color-focus);
}

.field__select:disabled {
  background: var(--color-surface-sunken);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.field--invalid .field__select {
  border-color: var(--color-danger-solid);
}

.field__chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.field__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.field__error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}
</style>
