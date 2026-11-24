<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Détail facture"
    description="Détail et lignes (HT / TVA / TTC), PDF source, correction et validation humaine des données extraites, rapprochement lié."
    services="invoices.getInvoice / updateInvoice / validateInvoice"
  />
</template>
