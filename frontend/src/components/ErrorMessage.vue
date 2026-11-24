<script setup lang="ts">
import type { ApiError } from '@/core/errors'

/** Affichage uniforme d'une ApiError (message + détails par champ + bouton Réessayer). */
defineProps<{ error: ApiError | null }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="error" class="error" role="alert" data-testid="api-error" :data-code="error.code">
    <p>{{ error.message }}</p>
    <ul v-if="error.details.length">
      <li v-for="d in error.details" :key="d.field + d.message">{{ d.field }} : {{ d.message }}</li>
    </ul>
    <button type="button" @click="$emit('retry')">Réessayer</button>
  </div>
</template>

<style scoped>
.error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
</style>
