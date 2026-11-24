<script setup lang="ts">
/**
 * Champ texte avec libellé, aide et message d'erreur reliés par ARIA.
 * Utilisation : <BaseTextField v-model="supplier" label="Fournisseur" :error="errors.supplier" />
 */
import { computed, useId } from 'vue'
import BaseIcon from './BaseIcon.vue'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    type?: 'text' | 'email' | 'password' | 'search' | 'date' | 'tel' | 'url'
    /** Clavier mobile adapté ; 'decimal' pour les montants. */
    inputmode?: 'text' | 'decimal' | 'numeric' | 'email' | 'search'
    placeholder?: string
    /** Texte d'aide affiché sous le champ. */
    hint?: string
    /** Message d'erreur : rend le champ invalide (aria-invalid). */
    error?: string
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    /** Unité affichée à droite, ex. '€' ou '%'. */
    suffix?: string
    /** Teinte le fond selon la provenance de la valeur (écran de correction IA). */
    tint?: 'extracted' | 'corrected'
  }>(),
  {
    type: 'text',
    inputmode: undefined,
    placeholder: undefined,
    hint: undefined,
    error: undefined,
    autocomplete: undefined,
    suffix: undefined,
    tint: undefined,
  },
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
  <div class="field" :class="{ 'field--invalid': !!error, 'field--disabled': disabled }">
    <div class="field__label-row">
      <label class="field__label" :for="id">
        {{ label }}
        <span v-if="required" class="field__required" aria-hidden="true">*</span>
        <span v-if="required" class="sr-only">(obligatoire)</span>
      </label>
      <!-- Emplacement pour un badge de provenance IA, un lien d'aide… -->
      <slot name="label-extra" />
    </div>

    <div class="field__control" :class="tint ? `field__control--${tint}` : undefined">
      <input
        :id="id"
        v-model="model"
        class="field__input"
        :type="type"
        :inputmode="inputmode"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
      />
      <span v-if="suffix" class="field__suffix" aria-hidden="true">{{ suffix }}</span>
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

.field__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.field__required {
  color: var(--color-danger-text);
  margin-left: 2px;
}

.field__control {
  display: flex;
  align-items: center;
  min-height: var(--control-height);
  background: var(--color-surface);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--easing-standard);
}

.field__control--extracted {
  background: var(--color-field-extracted-bg);
}

.field__control--corrected {
  background: var(--color-field-corrected-bg);
}

.field__control:hover {
  border-color: var(--color-border-strong);
}

.field__control:focus-within {
  border-color: var(--color-focus);
  box-shadow: 0 0 0 1px var(--color-focus);
}

.field--invalid .field__control {
  border-color: var(--color-danger-solid);
}

.field--disabled .field__control {
  background: var(--color-surface-sunken);
  border-color: var(--color-border);
}

.field__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: calc(var(--control-height) - 2px);
  padding: 0 var(--space-3);
  border: 0;
  background: transparent;
  font-size: var(--font-size-md); /* 16 px : évite le zoom auto sur iOS */
  outline: none;
}

.field__input::placeholder {
  color: var(--color-text-muted);
}

.field__input:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.field__suffix {
  padding-right: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
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

.field__error svg {
  margin-top: 2px;
}
</style>
