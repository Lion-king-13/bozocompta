<script setup lang="ts">
import { RouteName } from '@/router/routeNames'
</script>

<template>
  <section>
    <h1>Page introuvable</h1>
    <RouterLink :to="{ name: RouteName.Landing }">Retour à l'accueil</RouterLink>
  </section>
</template>
