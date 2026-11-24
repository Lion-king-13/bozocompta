<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Consommation IA"
    description="Tokens consommés, coût indicatif, quota de l'offre (src/config/plans.ts), dépassement."
    services="aiUsage.getUsageSummary / listUsage"
  />
</template>
