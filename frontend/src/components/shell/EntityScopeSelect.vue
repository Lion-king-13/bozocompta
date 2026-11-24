<script setup lang="ts">
/**
 * Sélecteur de périmètre : « Organisation consolidée » ou une entité accessible.
 * Branché sur le store `entityScope` (null = toutes les entités accessibles).
 * Les entités proposées viennent du service (déjà filtrées selon l'utilisateur).
 */
import { computed, useId } from 'vue'
import type { LegalEntity } from '@/domain'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'

const props = withDefaults(defineProps<{ entities: LegalEntity[]; variant?: 'dark' | 'light' }>(), {
  variant: 'light',
})

/** Émis seulement sur un choix de l'utilisateur (jamais sur une mise à jour programmée). */
const emit = defineEmits<{ change: [entityId: string | null] }>()

const scope = useEntityScopeStore()
const auth = useAuthStore()
const id = useId()

/** admin / finance voient toute l'organisation ; les autres « toutes leurs entités ». */
const allLabel = computed(() =>
  auth.role === 'admin' || auth.role === 'finance'
    ? 'Organisation consolidée'
    : 'Toutes mes entités',
)

const ALL = '__all__'
const value = computed({
  get: () => scope.selectedEntityId ?? ALL,
  set: (v: string) => {
    const entityId = v === ALL ? null : v
    scope.select(entityId)
    emit('change', entityId)
  },
})

const single = computed(() => (props.entities.length === 1 ? props.entities[0] : undefined))
</script>

<template>
  <div class="scope" :class="`scope--${variant}`" data-testid="entity-scope">
    <label class="scope__label" :for="id">Périmètre</label>
    <!-- Une seule entité accessible : pas de choix à faire -->
    <p v-if="single" :id="id" class="scope__single">{{ single.name }}</p>
    <div v-else class="scope__control">
      <select :id="id" v-model="value" class="scope__select">
        <option :value="ALL">{{ allLabel }}</option>
        <option v-for="entity in entities" :key="entity.id" :value="entity.id">
          {{ entity.name }}
        </option>
      </select>
      <svg class="scope__chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.scope {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.scope__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.scope--dark .scope__label {
  color: var(--color-sidebar-text-muted);
}

.scope__control {
  position: relative;
}

.scope__select,
.scope__single {
  width: 100%;
  min-height: var(--control-height);
  padding: 0 var(--space-8) 0 var(--space-3);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  appearance: none;
  cursor: pointer;
}

.scope__single {
  display: flex;
  align-items: center;
  cursor: default;
}

.scope__select:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.scope--dark .scope__select,
.scope--dark .scope__single {
  background: var(--color-sidebar-hover);
  border-color: var(--color-sidebar-border);
  color: var(--color-text-inverse);
}

.scope--dark .scope__select:focus-visible {
  outline-color: var(--color-focus-inverse);
}

.scope__chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
