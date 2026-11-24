<script setup lang="ts">
/**
 * Coque de l'application connectée.
 * - Desktop (≥ 1024 px) : barre latérale fixe (logo, périmètre, navigation, utilisateur).
 * - Mobile / tablette : barre supérieure + navigation en tiroir (focus piégé, Échap).
 * - Bandeau « Mode démonstration » avec le panneau des erreurs simulables.
 * La navigation est filtrée selon les permissions ; un accès direct par URL à une page non
 * autorisée est renvoyé vers « Accès refusé » par la garde du routeur.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNav from '@/components/shell/AppNav.vue'
import BrandLogo from '@/components/shell/BrandLogo.vue'
import DemoModeBanner from '@/components/shell/DemoModeBanner.vue'
import EntityScopeSelect from '@/components/shell/EntityScopeSelect.vue'
import UserMenu from '@/components/shell/UserMenu.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { useAsync } from '@/composables/useAsync'
import { usePreferences } from '@/composables/usePreferences'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import { visibleNavGroups } from './navigation'

const auth = useAuthStore()
const scope = useEntityScopeStore()
const route = useRoute()
const router = useRouter()
const preferences = usePreferences()

const groups = computed(() => visibleNavGroups((p) => auth.can(p)))
const entities = useAsync(() => useServices().organization.listEntities())
const entityList = computed(() => entities.data.value ?? [])

// ---- Périmètre
// Règle (QA-16) : les watchers ne font JAMAIS naviguer. Seul un choix explicite de
// l'utilisateur dans le sélecteur ouvre un autre tableau de bord (`onScopeChange`).
// Ainsi, une URL vers une entité inaccessible reste affichée : la vue du tableau de bord
// d'entité montre elle-même « Accès refusé ».
const isAccessible = (id: string | null) => !!id && entityList.value.some((e) => e.id === id)

// Préférence par défaut à la connexion / au changement d'utilisateur ; sélection invalide oubliée.
watch(
  [() => auth.user?.id, entityList],
  ([, list], [previousUser]) => {
    if (!auth.user || !list.length) return
    const userChanged = previousUser !== undefined && previousUser !== auth.user.id
    const routeEntity = route.name === RouteName.EntityDashboard ? route.params.entityId : null
    if (typeof routeEntity === 'string' && isAccessible(routeEntity)) {
      scope.select(routeEntity) // l'URL d'un tableau de bord d'entité fait foi
    } else if (userChanged || !isAccessible(scope.selectedEntityId)) {
      const preferred = preferences.value.defaultEntityId
      scope.select(isAccessible(preferred) ? preferred : null)
    }
  },
  { immediate: true },
)

// URL d'un tableau de bord d'entité (lien, navigation) → sélecteur, si l'entité est accessible.
watch(
  () => route.params.entityId,
  (entityId) => {
    if (route.name !== RouteName.EntityDashboard || typeof entityId !== 'string') return
    if (isAccessible(entityId) && scope.selectedEntityId !== entityId) scope.select(entityId)
  },
)

/** Choix explicite dans le sélecteur : sur un tableau de bord, ouvrir celui du périmètre. */
function onScopeChange(entityId: string | null) {
  if (route.name === RouteName.OrganizationDashboard && entityId) {
    void router.replace({ name: RouteName.EntityDashboard, params: { entityId } })
  } else if (route.name === RouteName.EntityDashboard && route.params.entityId !== entityId) {
    void router.replace(
      entityId
        ? { name: RouteName.EntityDashboard, params: { entityId } }
        : { name: RouteName.OrganizationDashboard },
    )
  }
}

// ---- Tiroir de navigation (mobile)
const drawerOpen = ref(false)
const drawer = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)

async function openDrawer() {
  drawerOpen.value = true
  await nextTick()
  drawer.value?.querySelector<HTMLElement>('a, button, select')?.focus()
}

function closeDrawer(returnFocus = true) {
  if (!drawerOpen.value) return
  drawerOpen.value = false
  if (returnFocus) menuButton.value?.focus()
}

function onDrawerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDrawer()
    return
  }
  if (event.key !== 'Tab' || !drawer.value) return
  const items = Array.from(
    drawer.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select'),
  )
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

// Fermeture automatique quand on change de page
watch(
  () => route.fullPath,
  () => closeDrawer(false),
)
watch(drawerOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>

<template>
  <a class="skip-link" href="#contenu">Aller au contenu</a>

  <div class="app">
    <!-- Barre latérale desktop -->
    <aside class="sidebar" aria-label="Barre latérale">
      <RouterLink
        :to="{ name: RouteName.OrganizationDashboard }"
        class="sidebar__brand"
        aria-label="CashLens — tableau de bord"
      >
        <BrandLogo inverse />
      </RouterLink>
      <EntityScopeSelect :entities="entityList" variant="dark" @change="onScopeChange" />
      <div class="sidebar__nav">
        <AppNav :groups="groups" />
      </div>
      <div class="sidebar__user">
        <UserMenu variant="dark" placement="up" />
      </div>
    </aside>

    <div class="column">
      <DemoModeBanner with-panel />

      <!-- Barre supérieure mobile / tablette -->
      <header class="topbar">
        <div class="topbar__row">
          <button
            ref="menuButton"
            type="button"
            class="topbar__menu"
            :aria-expanded="drawerOpen"
            aria-controls="app-drawer"
            @click="openDrawer"
          >
            <BaseIcon name="menu" :size="22" />
            <span class="sr-only">Ouvrir le menu</span>
          </button>
          <RouterLink
            :to="{ name: RouteName.OrganizationDashboard }"
            class="topbar__brand"
            aria-label="CashLens — tableau de bord"
          >
            <BrandLogo />
          </RouterLink>
          <UserMenu class="topbar__user" />
        </div>
        <div class="topbar__scope">
          <EntityScopeSelect :entities="entityList" @change="onScopeChange" />
        </div>
      </header>

      <!-- Tiroir de navigation mobile -->
      <Transition name="drawer">
        <div v-if="drawerOpen" class="drawer-backdrop" @click.self="closeDrawer()">
          <div
            id="app-drawer"
            ref="drawer"
            class="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            @keydown="onDrawerKeydown"
          >
            <div class="drawer__head">
              <BrandLogo inverse />
              <button type="button" class="drawer__close" @click="closeDrawer()">
                <BaseIcon name="x" :size="22" />
                <span class="sr-only">Fermer le menu</span>
              </button>
            </div>
            <AppNav :groups="groups" @navigate="closeDrawer(false)" />
          </div>
        </div>
      </Transition>

      <main id="contenu" class="main" tabindex="-1">
        <div class="main__inner">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ---- Barre latérale (desktop) */
.sidebar {
  display: none;
}

.sidebar__brand {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  text-decoration: none;
}

.sidebar__brand:focus-visible {
  outline: 2px solid var(--color-focus-inverse);
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  margin: 0 calc(var(--space-2) * -1);
  padding: 0 var(--space-2);
  scrollbar-width: thin;
  scrollbar-color: var(--color-sidebar-active) transparent;
}

.sidebar__user {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-sidebar-border);
}

/* ---- Barre supérieure (mobile / tablette) */
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-xs);
}

.topbar__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--topbar-height);
  padding: 0 var(--space-2);
}

.topbar__menu,
.drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target);
  height: var(--touch-target);
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text);
}

.topbar__menu:focus-visible,
.topbar__brand:focus-visible {
  outline: var(--focus-outline);
}

.topbar__brand {
  display: inline-flex;
  text-decoration: none;
}

.topbar__user {
  margin-left: auto;
}

.topbar__scope {
  padding: 0 var(--page-gutter) var(--space-3);
}

/* ---- Tiroir */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-overlay);
}

.drawer {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(20rem, 86vw);
  height: 100%;
  padding: var(--space-3) var(--space-4) var(--space-6);
  overflow-y: auto;
  background: var(--color-sidebar-bg);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-lg);
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer__close {
  color: var(--color-text-inverse);
}

.drawer__close:focus-visible {
  outline: 2px solid var(--color-focus-inverse);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--duration-normal) var(--easing-standard);
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform var(--duration-normal) var(--easing-standard);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(-100%);
}

/* ---- Colonne principale (bandeau démo, barre mobile, contenu) */
.column {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

/* ---- Contenu */
.main {
  flex: 1;
  min-width: 0;
}

.main:focus {
  outline: none;
}

.main__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--space-6) var(--page-gutter) var(--space-16);
}

@media (min-width: 1024px) {
  .app {
    flex-direction: row;
  }

  .topbar {
    display: none;
  }

  .sidebar {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    width: var(--sidebar-width);
    height: 100vh;
    flex-shrink: 0;
    padding: var(--space-5) var(--space-4) var(--space-3);
    background: var(--color-sidebar-bg);
    color: var(--color-text-inverse);
  }

  .main__inner {
    padding-top: var(--space-8);
  }
}
</style>
