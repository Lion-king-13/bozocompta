<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue'
</script>

<template>
  <PlaceholderPage
    title="Import PDF"
    description="Import d'une facture PDF textuelle : contrôle du fichier (erreur « fichier invalide »), extraction IA SIMULÉE annoncée comme telle, correction des champs extraits (provenance par champ) puis confirmation humaine."
    services="invoices.importInvoicePdf / invoices.confirmDraft"
  />
</template>
