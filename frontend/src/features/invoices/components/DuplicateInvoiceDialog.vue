<script setup lang="ts">
/**
 * Confirmation d'un doublon de facture (QA-08) : le service refuse une facture avec le même
 * fournisseur et le même numéro qu'une facture existante (`CONFLICT` sur `number`).
 * L'utilisateur peut corriger le numéro, ou enregistrer quand même en connaissance de cause.
 */
import { BaseButton, BaseDialog } from '@/components/ui'

const open = defineModel<boolean>('open', { default: false })
defineProps<{ message: string; saving?: boolean }>()
defineEmits<{ confirm: [] }>()
</script>

<template>
  <BaseDialog v-model:open="open" title="Doublon potentiel" alert size="sm" :persistent="saving">
    <p>{{ message }}</p>
    <p>Vérifiez qu'il ne s'agit pas de la même facture importée deux fois.</p>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false"
        >Corriger la saisie</BaseButton
      >
      <BaseButton
        variant="danger"
        :loading="saving"
        data-testid="confirm-duplicate"
        @click="$emit('confirm')"
        >Enregistrer quand même</BaseButton
      >
    </template>
  </BaseDialog>
</template>
