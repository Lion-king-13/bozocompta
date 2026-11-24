<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Confidentialité et données"
    description="Export des données personnelles (JSON), suppression de son compte ou (admin) des données de l'organisation, réinitialisation des données de démonstration. En mode démo, l'effet est réel en mémoire jusqu'au rechargement de la page."
    services="privacy.exportMyData / requestDeletion / resetDemoData"
  />
</template>
