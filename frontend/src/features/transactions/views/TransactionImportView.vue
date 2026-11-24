<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Import CSV"
    description="Import d'un relevé CSV (format documenté, fichiers d'exemple dans public/demo/) : erreurs par ligne si fichier invalide, rien n'est importé."
    services="transactions.importCsv"
  />
</template>
