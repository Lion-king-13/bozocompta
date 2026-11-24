<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Transactions"
    description="Liste des transactions (débit / crédit), statut de rapprochement, justificatif manquant, carte, catégorie, imputations."
    services="transactions.listTransactions"
  />
</template>
