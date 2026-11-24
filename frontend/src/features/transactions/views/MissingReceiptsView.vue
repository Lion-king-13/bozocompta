<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Justificatifs manquants"
    description="Débits sans facture rapprochée et confirmée : ils comptent dans les dépenses, il manque le justificatif."
    services="transactions.listMissingReceipts"
  />
</template>
