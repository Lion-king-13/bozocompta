<script setup lang="ts">
import { RouteName } from '@/router/routeNames'
</script>

<template>
  <section data-testid="forbidden">
    <h1>Accès refusé</h1>
    <p>Votre rôle ne permet pas d'accéder à cette page. Contactez un administrateur si besoin.</p>
    <RouterLink :to="{ name: RouteName.OrganizationDashboard }"
      >Retour au tableau de bord</RouterLink
    >
  </section>
</template>
