<script setup lang="ts">
import ToastRegion from '@/components/ui/ToastRegion.vue'
import { useToasts } from '@/composables/useToasts'

const { toasts, dismiss } = useToasts()
</script>

<template>
  <RouterView />
  <!-- Notifications globales : une seule région pour toute l'application -->
  <ToastRegion :toasts="[...toasts]" @dismiss="dismiss" />
</template>
