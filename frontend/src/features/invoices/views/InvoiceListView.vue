<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Factures"
    description="Liste des factures : filtres (entité, statut, fournisseur, catégorie, période), recherche, pagination, badge de provenance (extrait par l'IA / corrigé / enregistré)."
    services="invoices.listInvoices"
  />
</template>
