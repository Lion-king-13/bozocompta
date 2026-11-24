<script setup lang="ts">
/**
 * Ligne affichée sous un champ du formulaire de correction : badge de provenance,
 * valeur d'origine si l'utilisateur l'a corrigée, et lien « Revenir à la valeur extraite ».
 */
import { AiProvenanceBadge } from '@/components/ui'
import type { DataProvenance } from '@/domain'

defineProps<{
  provenance: DataProvenance | null
  /** Valeur d'origine (affichée quand le champ est corrigé). */
  originalText?: string
  /** Libellé de la valeur d'origine (« Valeur extraite », « Valeur enregistrée »). */
  originalLabel?: string
  readonly?: boolean
}>()
defineEmits<{ revert: [] }>()
</script>

<template>
  <div v-if="provenance" class="meta" data-testid="field-provenance" :data-provenance="provenance">
    <AiProvenanceBadge :provenance="provenance" size="sm" />
    <template v-if="provenance === 'user_corrected' && originalText !== undefined">
      <span class="meta__original"
        >{{ originalLabel ?? 'Valeur extraite' }} : {{ originalText || '(vide)' }}</span
      >
      <button v-if="!readonly" type="button" class="meta__revert" @click="$emit('revert')">
        Revenir à cette valeur
      </button>
    </template>
  </div>
</template>

<style scoped>
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.meta__revert {
  background: none;
  border: 0;
  padding: 0;
  color: var(--color-text-link);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
}
</style>
