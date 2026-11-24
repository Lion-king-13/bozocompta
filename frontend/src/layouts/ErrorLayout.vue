<script setup lang="ts">
/**
 * Coque des pages d'erreur (403, 404) — QA-13.
 * Utilisateur connecté : la coque applicative (navigation, périmètre, menu) reste affichée.
 * Visiteur : coque publique. La page d'erreur elle-même est la route enfant (`RouterView`).
 */
import { useAuthStore } from '@/stores/auth'
import AppLayout from './AppLayout.vue'
import PublicLayout from './PublicLayout.vue'

const auth = useAuthStore()
</script>

<template>
  <AppLayout v-if="auth.isAuthenticated"><RouterView /></AppLayout>
  <PublicLayout v-else><RouterView /></PublicLayout>
</template>
