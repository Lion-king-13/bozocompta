<script setup lang="ts">
/**
 * Bouton. Rendu en <a> si `href` est fourni (lien qui ressemble à un bouton).
 * Pour un lien interne de l'application, envelopper dans <RouterLink custom>
 * ou utiliser directement RouterLink avec la classe `base-button`.
 */
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'md' | 'sm'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** Affiche un indicateur et bloque le bouton pendant une action. */
    loading?: boolean
    /** Icône avant le libellé. */
    icon?: IconName
    /** Prend toute la largeur disponible. */
    block?: boolean
    href?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    icon: undefined,
    href: undefined,
  },
)

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-disabled="href && disabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--block': block },
    ]"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <BaseIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span class="base-button__label"><slot /></span>
    <span v-if="loading" class="sr-only">(en cours)</span>
  </component>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-height);
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}

.base-button:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.base-button--sm {
  min-height: var(--control-height-sm);
  padding: 0 var(--space-3);
}

.base-button--block {
  display: flex;
  width: 100%;
}

.base-button--primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}
.base-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.base-button--primary:active:not(:disabled) {
  background: var(--color-primary-active);
}

.base-button--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}
.base-button--secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.base-button--ghost {
  background: transparent;
  color: var(--color-primary);
}
.base-button--ghost:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.base-button--danger {
  background: var(--color-danger);
  color: var(--color-text-on-danger);
}
.base-button--danger:hover:not(:disabled) {
  background: var(--color-danger-hover);
}

.base-button:disabled,
.base-button[aria-disabled='true'] {
  opacity: 0.55;
  cursor: not-allowed;
}

/* En cours de chargement : bloqué mais pas « grisé » (l'action est en train de se faire) */
.base-button[aria-busy='true'] {
  opacity: 0.85;
  cursor: progress;
}

/* Cible tactile confortable sur mobile */
@media (pointer: coarse) {
  .base-button {
    min-height: var(--touch-target);
  }
}

.base-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: base-button-spin 0.7s linear infinite;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
