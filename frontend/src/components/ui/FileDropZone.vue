<script setup lang="ts">
/**
 * Zone de dépôt de fichier (glisser-déposer OU bouton de sélection au clavier).
 * Vérifie l'extension et la taille AVANT tout envoi, puis émet :
 *   - `select`  : fichiers acceptés ;
 *   - `reject`  : fichiers refusés avec un message en français.
 * Le composant n'envoie rien lui-même : la page appelle le service d'import.
 *
 *   <FileDropZone accept=".pdf" :max-size-mb="10" label="Déposez votre facture PDF"
 *     hint="PDF textuel uniquement, 10 Mo maximum." @select="upload" @reject="showErrors" />
 */
import { computed, ref, useId } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { RejectedFile } from './types'

const props = withDefaults(
  defineProps<{
    label: string
    /** Extensions acceptées séparées par des virgules, ex. '.pdf' ou '.csv'. */
    accept: string
    maxSizeMb?: number
    multiple?: boolean
    hint?: string
    disabled?: boolean
    /** Message d'erreur à afficher sous la zone (ex. fichier invalide côté serveur). */
    error?: string
  }>(),
  { maxSizeMb: 10, hint: undefined, error: undefined },
)

const emit = defineEmits<{
  select: [files: File[]]
  reject: [rejected: RejectedFile[]]
}>()

const id = useId()
const dragging = ref(false)

const extensions = computed(() =>
  props.accept
    .split(',')
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean),
)

function check(files: File[]) {
  const accepted: File[] = []
  const rejected: RejectedFile[] = []
  for (const file of files) {
    const name = file.name.toLowerCase()
    if (!extensions.value.some((ext) => name.endsWith(ext))) {
      rejected.push({
        file,
        reason: 'type',
        message: `«\u00a0${file.name}\u00a0» n'est pas un fichier ${extensions.value.join(' ou ').toUpperCase()}.`,
      })
    } else if (file.size > props.maxSizeMb * 1024 * 1024) {
      rejected.push({
        file,
        reason: 'size',
        message: `«\u00a0${file.name}\u00a0» dépasse ${props.maxSizeMb} Mo.`,
      })
    } else {
      accepted.push(file)
    }
  }
  if (accepted.length) emit('select', props.multiple ? accepted : accepted.slice(0, 1))
  if (rejected.length) emit('reject', rejected)
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  check(Array.from(target.files ?? []))
  target.value = '' // permet de re-sélectionner le même fichier
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (props.disabled) return
  check(Array.from(event.dataTransfer?.files ?? []))
}
</script>

<template>
  <div class="dropzone-field">
    <label
      :for="id"
      class="dropzone"
      :class="{
        'dropzone--dragging': dragging,
        'dropzone--disabled': disabled,
        'dropzone--invalid': !!error,
      }"
      @dragover.prevent="dragging = !disabled"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="dropzone__icon"><BaseIcon name="upload" :size="28" /></span>
      <span class="dropzone__label">{{ label }}</span>
      <span class="dropzone__action"
        >ou <span class="dropzone__link">parcourir vos fichiers</span></span
      >
      <span v-if="hint" class="dropzone__hint">{{ hint }}</span>
    </label>
    <input
      :id="id"
      class="dropzone__input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      :aria-describedby="error ? `${id}-error` : undefined"
      @change="onChange"
    />
    <p v-if="error" :id="`${id}-error`" class="dropzone__error" role="alert">
      <BaseIcon name="alert-circle" :size="16" />
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.dropzone-field {
  position: relative;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-8) var(--space-4);
  border: 2px dashed var(--color-border-input);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard);
}

.dropzone:hover,
.dropzone--dragging {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.dropzone--invalid {
  border-color: var(--color-danger-solid);
}

.dropzone--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Le vrai champ fichier est invisible mais reste focusable au clavier */
.dropzone__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

/* Focus clavier sur l'input → anneau visible sur la zone */
.dropzone-field:has(.dropzone__input:focus-visible) .dropzone {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.dropzone__icon {
  display: inline-flex;
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.dropzone__label {
  font-weight: var(--font-weight-semibold);
}

.dropzone__action {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dropzone__link {
  color: var(--color-text-link);
  text-decoration: underline;
}

.dropzone__hint {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dropzone__error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}
</style>
