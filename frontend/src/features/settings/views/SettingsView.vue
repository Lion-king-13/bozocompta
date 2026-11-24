<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Paramètres"
    description="Paramètres de l'utilisateur (profil, préférences d'affichage)."
    services="users.getUser"
  />
</template>
