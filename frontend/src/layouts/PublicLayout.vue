<script setup lang="ts">
import { RouteName } from '@/router/routeNames'
</script>

<template>
  <div class="public">
    <header class="header">
      <RouterLink :to="{ name: RouteName.Landing }" class="brand">CashLens</RouterLink>
      <nav>
        <RouterLink :to="{ name: RouteName.PublicPrivacy }">Confidentialité et IA</RouterLink>
        <RouterLink :to="{ name: RouteName.Login }">Connexion</RouterLink>
      </nav>
    </header>
    <main class="main"><RouterView /></main>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.header nav {
  display: flex;
  gap: var(--space-4);
}
.brand {
  font-weight: 700;
  text-decoration: none;
}
.main {
  padding: var(--space-6);
}
</style>
