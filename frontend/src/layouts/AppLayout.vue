<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import DemoModePanel from '@/components/DemoModePanel.vue'
import { ROLE_LABELS } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useAuthStore } from '@/stores/auth'
import { NAVIGATION } from './navigation'

/** Layout provisoire de l'application authentifiée (l'agent UI le redessinera). */
const auth = useAuthStore()
const router = useRouter()
const items = computed(() => NAVIGATION.filter((i) => !i.permission || auth.can(i.permission)))

async function logout() {
  await auth.logout()
  await router.push({ name: RouteName.Login })
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <RouterLink :to="{ name: RouteName.OrganizationDashboard }" class="brand"
        >CashLens</RouterLink
      >
      <nav>
        <RouterLink v-for="item in items" :key="item.route" :to="{ name: item.route }">{{
          item.label
        }}</RouterLink>
      </nav>
    </aside>
    <div class="content">
      <header class="topbar">
        <DemoModePanel />
        <div v-if="auth.user" class="user" data-testid="current-user">
          {{ auth.user.firstName }} {{ auth.user.lastName }} · {{ ROLE_LABELS[auth.user.role] }}
          <button type="button" @click="logout">Déconnexion</button>
        </div>
      </header>
      <main class="main"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-4);
}
.brand {
  font-weight: 700;
  text-decoration: none;
}
.content {
  flex: 1;
  min-width: 0;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.main {
  padding: var(--space-6);
}
@media (max-width: 768px) {
  .app {
    flex-direction: column;
  }
  .sidebar {
    width: auto;
  }
}
</style>
