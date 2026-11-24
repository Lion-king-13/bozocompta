<script setup lang="ts">
/**
 * Modale accessible.
 * - Ouverte/fermée via v-model:open.
 * - À l'ouverture : focus sur le premier élément interactif (ou sur la modale).
 * - Tab / Maj+Tab restent DANS la modale (focus piégé).
 * - Échap ferme ; à la fermeture le focus revient sur l'élément d'origine.
 * - role="alertdialog" pour une confirmation destructive (`alert`).
 *
 * <BaseDialog v-model:open="confirmOpen" title="Supprimer la facture ?">
 *   Cette action est définitive.
 *   <template #footer>
 *     <BaseButton variant="secondary" @click="confirmOpen = false">Annuler</BaseButton>
 *     <BaseButton variant="danger" @click="remove">Supprimer</BaseButton>
 *   </template>
 * </BaseDialog>
 */
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg'
    /** Confirmation importante : role="alertdialog", pas de fermeture au clic extérieur. */
    alert?: boolean
    /** Empêche la fermeture (ex. pendant un enregistrement). */
    persistent?: boolean
  }>(),
  { description: undefined, size: 'md' },
)

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(): HTMLElement[] {
  return panel.value ? Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
}

function close() {
  if (props.persistent) return
  open.value = false
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusableElements()
  if (items.length === 0) {
    event.preventDefault()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onBackdropClick() {
  if (!props.alert) close()
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      // Premier champ ou bouton ; sinon la modale elle-même (tabindex="-1")
      const target = focusableElements().find((el) => !el.classList.contains('dialog__close'))
      ;(target ?? panel.value)?.focus()
    } else {
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog__backdrop" @mousedown.self="onBackdropClick">
        <div
          ref="panel"
          :class="['dialog', `dialog--${size}`]"
          :role="alert ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header class="dialog__header">
            <div>
              <h2 :id="titleId" class="dialog__title">{{ title }}</h2>
              <p v-if="description" :id="descriptionId" class="dialog__description">
                {{ description }}
              </p>
            </div>
            <button
              v-if="!persistent"
              type="button"
              class="dialog__close"
              aria-label="Fermer la fenêtre"
              @click="close"
            >
              <BaseIcon name="x" :size="20" />
            </button>
          </header>

          <div class="dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="dialog__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog__backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end; /* mobile : la modale monte depuis le bas */
  justify-content: center;
  background: var(--color-overlay);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 92vh;
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-lg);
}

.dialog:focus-visible {
  outline: none;
}

.dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-5) var(--space-3);
}

.dialog__title {
  font-size: var(--font-size-xl);
}

.dialog__description {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target);
  height: var(--touch-target);
  margin: calc(var(--space-2) * -1) calc(var(--space-2) * -1) 0 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
}

.dialog__close:hover {
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.dialog__close:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 0;
}

.dialog__body {
  padding: 0 var(--space-5) var(--space-5);
  overflow-y: auto;
}

.dialog__footer {
  display: flex;
  flex-direction: column-reverse; /* mobile : action principale en haut, pleine largeur */
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border-subtle);
}

@media (min-width: 640px) {
  .dialog__backdrop {
    align-items: center;
    padding: var(--space-6);
  }

  .dialog {
    border-radius: var(--radius-lg);
  }

  .dialog--sm {
    max-width: 26rem;
  }
  .dialog--md {
    max-width: 36rem;
  }
  .dialog--lg {
    max-width: 52rem;
  }

  .dialog__footer {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--duration-normal) var(--easing-standard);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
