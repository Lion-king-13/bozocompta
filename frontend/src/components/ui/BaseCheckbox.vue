<script setup lang="ts">
/**
 * Case à cocher native, stylée, avec libellé cliquable, description et erreur.
 * Utilisation : <BaseCheckbox v-model="accepted" label="J'accepte…" :error="errors.accepted" />
 */
import { computed, useId } from 'vue'
import BaseIcon from './BaseIcon.vue'

const model = defineModel<boolean>({ default: false })

const props = defineProps<{
  label: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
}>()

const id = useId()
const descriptionId = `${id}-description`
const errorId = `${id}-error`
const describedBy = computed(
  () =>
    [props.error ? errorId : null, props.description ? descriptionId : null]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="checkbox" :class="{ 'checkbox--invalid': !!error, 'checkbox--disabled': disabled }">
    <div class="checkbox__row">
      <input
        :id="id"
        v-model="model"
        class="checkbox__input"
        type="checkbox"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
      />
      <div class="checkbox__text">
        <label class="checkbox__label" :for="id">{{ label }}</label>
        <p v-if="description" :id="descriptionId" class="checkbox__description">
          {{ description }}
        </p>
      </div>
    </div>
    <p v-if="error" :id="errorId" class="checkbox__error">
      <BaseIcon name="alert-circle" :size="16" />
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.checkbox__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.checkbox__input {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.15rem;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.checkbox__input:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.checkbox__label {
  font-size: var(--font-size-md);
  cursor: pointer;
}

.checkbox--disabled .checkbox__label {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.checkbox__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.checkbox--invalid .checkbox__input {
  outline: 2px solid var(--color-danger-solid);
  outline-offset: 1px;
}

.checkbox__error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  margin-top: var(--space-1);
  margin-left: calc(1.125rem + var(--space-3));
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}
</style>
