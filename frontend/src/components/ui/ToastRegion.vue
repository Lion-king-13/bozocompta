<script setup lang="ts">
/**
 * Zone d'affichage des toasts (notifications brèves après une action).
 * Le composant n'a PAS d'état propre : la liste vient de la couche applicative
 * (ex. un composable useToasts) et il émet `dismiss` quand un toast doit partir.
 *
 * À placer une seule fois dans App.vue :
 *   <ToastRegion :toasts="toasts" @dismiss="removeToast" />
 *
 * Règle : un toast confirme une action réussie ou signale un échec non bloquant.
 * Une erreur qui empêche de continuer s'affiche dans la page (BaseAlert / ErrorState).
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { TONE_ICON } from './catalog'
import type { ToastItem } from './types'

const props = defineProps<{ toasts: ToastItem[] }>()
const emit = defineEmits<{ dismiss: [id: string] }>()

const DEFAULT_DURATION = 6000
const timers = new Map<string, ReturnType<typeof setTimeout>>()

// Programme la disparition automatique de chaque nouveau toast
watch(
  () => props.toasts.map((t) => t.id),
  () => {
    for (const toast of props.toasts) {
      const duration = toast.duration ?? DEFAULT_DURATION
      if (duration > 0 && !timers.has(toast.id)) {
        timers.set(
          toast.id,
          setTimeout(() => {
            timers.delete(toast.id)
            emit('dismiss', toast.id)
          }, duration),
        )
      }
    }
  },
  { immediate: true },
)

function dismiss(id: string) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  emit('dismiss', id)
}

onBeforeUnmount(() => timers.forEach((timer) => clearTimeout(timer)))

// Deux régions « live » : polie pour les confirmations, assertive pour les erreurs
const groups = computed(
  () =>
    [
      { role: 'status', live: 'polite', items: props.toasts.filter((t) => t.tone !== 'danger') },
      { role: 'alert', live: 'assertive', items: props.toasts.filter((t) => t.tone === 'danger') },
    ] as const,
)
</script>

<template>
  <div class="toast-region">
    <div
      v-for="group in groups"
      :key="group.role"
      :role="group.role"
      :aria-live="group.live"
      class="toast-region__list"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in group.items"
          :key="toast.id"
          :class="['toast', `toast--${toast.tone}`]"
        >
          <BaseIcon class="toast__icon" :name="TONE_ICON[toast.tone]" :size="20" />
          <div class="toast__content">
            <p class="toast__title">{{ toast.title }}</p>
            <p v-if="toast.message" class="toast__message">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="toast__close"
            aria-label="Fermer la notification"
            @click="dismiss(toast.id)"
          >
            <BaseIcon name="x" :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  z-index: var(--z-toast);
  left: var(--space-4);
  right: var(--space-4);
  bottom: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}

.toast-region__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@media (min-width: 640px) {
  .toast-region {
    left: auto;
    width: 24rem;
    right: var(--space-6);
    bottom: var(--space-6);
  }
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-left: 4px solid;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.toast--neutral,
.toast--info {
  border-left-color: var(--color-info-solid);
}
.toast--info .toast__icon {
  color: var(--color-info-text);
}
.toast--success {
  border-left-color: var(--color-success-solid);
}
.toast--success .toast__icon {
  color: var(--color-success-text);
}
.toast--warning {
  border-left-color: var(--color-warning-solid);
}
.toast--warning .toast__icon {
  color: var(--color-warning-text);
}
.toast--danger {
  border-left-color: var(--color-danger-solid);
}
.toast--danger .toast__icon {
  color: var(--color-danger-text);
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.toast__message {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.toast__close {
  display: inline-flex;
  padding: var(--space-1);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
}

.toast__close:focus-visible {
  outline: var(--focus-outline);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--duration-normal) var(--easing-standard),
    transform var(--duration-normal) var(--easing-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
