<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Allocations analytiques"
    description="Ventilation d'une transaction en pourcentages (entité + centre de coûts facultatif), somme = 100 % exactement, montants dérivés sans perte de centime. Lecture « payé par » / « imputé à »."
    services="allocations.listAllocations / replaceAllocations"
  />
</template>
