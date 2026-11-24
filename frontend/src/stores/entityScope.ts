import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Id } from '@/domain'

/** Entité sélectionnée dans l'en-tête (null = toute l'organisation). Partagé par les écrans. */
export const useEntityScopeStore = defineStore('entityScope', () => {
  const selectedEntityId = ref<Id | null>(null)
  function select(entityId: Id | null): void {
    selectedEntityId.value = entityId
  }
  return { selectedEntityId, select }
})
