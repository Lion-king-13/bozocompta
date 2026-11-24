<script setup lang="ts">
/**
 * Icône SVG en trait. Décorative par défaut (masquée aux lecteurs d'écran).
 * Donner `label` uniquement si l'icône porte seule une information.
 */
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Taille en px (largeur = hauteur). */
    size?: number
    /** Texte alternatif : rend l'icône « parlante » (role="img"). */
    label?: string
  }>(),
  { size: 20, label: undefined },
)

const path = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="base-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>

<style scoped>
.base-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
