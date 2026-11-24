<script setup lang="ts">
/**
 * Liste de navigation de l'application (barre latérale desktop et tiroir mobile).
 * Les groupes reçus sont déjà filtrés selon les permissions.
 * Le tableau de bord (route vide sous /app) n'est actif que sur sa page exacte ; les autres
 * entrées restent actives sur leurs sous-pages.
 */
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { NavGroup } from '@/layouts/navigation'
import { RouteName } from '@/router/routeNames'

defineProps<{ groups: NavGroup[] }>()
defineEmits<{ navigate: [] }>()
</script>

<template>
  <nav class="app-nav" aria-label="Navigation principale">
    <div v-for="group in groups" :key="group.label" class="app-nav__group">
      <p class="app-nav__title" aria-hidden="true">{{ group.label }}</p>
      <ul class="app-nav__list" :aria-label="group.label">
        <li v-for="item in group.items" :key="item.route">
          <RouterLink
            :to="{ name: item.route }"
            class="app-nav__link"
            :active-class="item.route === RouteName.OrganizationDashboard ? '' : 'is-active'"
            exact-active-class="is-active"
            :data-testid="`nav-${item.route}`"
            @click="$emit('navigate')"
          >
            <BaseIcon :name="item.icon" :size="18" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.app-nav__title {
  padding: 0 var(--space-3);
  margin-bottom: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-sidebar-text-muted);
}

.app-nav__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  list-style: none;
}

.app-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 2.5rem;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.app-nav__link:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text-inverse);
}

.app-nav__link:focus-visible {
  outline: 2px solid var(--color-focus-inverse);
  outline-offset: -2px;
}

.app-nav__link.is-active,
.app-nav__link[aria-current='page'] {
  background: var(--color-sidebar-active);
  color: var(--color-text-inverse);
  box-shadow: inset 3px 0 0 var(--palette-amber-400);
}

@media (pointer: coarse) {
  .app-nav__link {
    min-height: var(--touch-target);
  }
}
</style>
