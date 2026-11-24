<script setup lang="ts">
/**
 * Confirmation d'une suppression définitive : explication, puis saisie d'un mot de
 * confirmation (« SUPPRIMER ») pour éviter un clic malheureux. Pas de piège : « Annuler »
 * est toujours disponible tant que la demande n'est pas envoyée.
 */
import { computed, ref, watch } from 'vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseTextField from '@/components/ui/BaseTextField.vue'
import type { ApiError } from '@/core/errors'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    confirmLabel: string
    loading?: boolean
    error?: ApiError | null
    /** Mot à recopier ; vide = simple confirmation. */
    confirmWord?: string
  }>(),
  { error: null, confirmWord: 'SUPPRIMER' },
)

const emit = defineEmits<{ confirm: [] }>()
const typed = ref('')

watch(open, (isOpen) => {
  if (isOpen) typed.value = ''
})

const confirmed = computed(
  () => !props.confirmWord || typed.value.trim().toUpperCase() === props.confirmWord,
)
</script>

<template>
  <BaseDialog v-model:open="open" :title="title" alert :persistent="loading" size="md">
    <div class="confirm">
      <slot />
      <BaseTextField
        v-if="confirmWord"
        v-model="typed"
        :label="`Pour confirmer, saisissez ${confirmWord}`"
        autocomplete="off"
      />
      <ErrorMessage :error="error" @retry="emit('confirm')" />
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="loading" @click="open = false">Annuler</BaseButton>
      <BaseButton
        variant="danger"
        icon="trash"
        :disabled="!confirmed"
        :loading="loading"
        data-testid="confirm-deletion"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.confirm :deep(ul) {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-5);
}
</style>
