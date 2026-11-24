<script setup lang="ts">
/**
 * Logo CashLens : une « lentille » (cercle) avec un point ambre, et le nom.
 * `inverse` : version claire pour fond foncé (barre latérale).
 */
withDefaults(defineProps<{ inverse?: boolean; size?: 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <span class="brand" :class="[{ 'brand--inverse': inverse }, `brand--${size}`]">
    <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="3.5" />
      <path
        d="M9 14.5h10M9 10.5h6M9 18.5h7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        opacity=".55"
      />
      <circle cx="25" cy="25" r="4.5" class="brand__dot" />
    </svg>
    <span class="brand__name">CashLens</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  letter-spacing: -0.02em;
  line-height: 1;
}

.brand--lg {
  font-size: var(--font-size-xl);
}

.brand--inverse {
  color: var(--color-text-inverse);
}

.brand__mark {
  width: 1.75em;
  height: 1.75em;
}

.brand__dot {
  fill: var(--palette-amber-400);
}

.brand__name {
  color: var(--color-text);
}

.brand--inverse .brand__name {
  color: var(--color-text-inverse);
}
</style>
