<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Budgets"
    description="Budgets mensuels par entité / catégorie / centre de coûts : consommé (base imputée), restant, dépassement."
    services="budgets.listBudgetStatuses"
  />
</template>
