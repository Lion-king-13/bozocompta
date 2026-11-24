<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Abonnements et échéances"
    description="Abonnements fournisseurs récurrents et échéances à venir (renouvellements, factures à payer)."
    services="subscriptions.listSubscriptions / listDueItems"
  />
</template>
