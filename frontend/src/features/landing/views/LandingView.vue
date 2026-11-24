<script setup lang="ts">
import { PLANS } from '@/config/plans'
import { formatCents } from '@/core/money'
import { RouteName } from '@/router/routeNames'

/** Landing PROVISOIRE : contenu et mise en page à reprendre par l'agent UI. */
const formatTokens = (n: number) => new Intl.NumberFormat('fr-BE').format(n)
</script>

<template>
  <section class="landing">
    <h1>CashLens</h1>
    <p>Comprenez qui dépense quoi, pour quelle entité et dans quel but.</p>
    <RouterLink :to="{ name: RouteName.Login }">Accéder à la démo</RouterLink>

    <h2>Offres</h2>
    <p class="muted">Tarifs et quotas provisoires, non validés.</p>
    <div class="plans">
      <article v-for="plan in PLANS" :key="plan.id" class="plan" data-testid="plan-card">
        <h3>{{ plan.name }}</h3>
        <p>{{ plan.tagline }}</p>
        <p class="amount">{{ formatCents(plan.monthlyPriceCents) }} / mois</p>
        <p>{{ formatTokens(plan.includedAiTokensPerMonth) }} tokens IA inclus par mois</p>
        <ul>
          <li v-for="f in plan.features" :key="f">{{ f }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-4);
}
.plan {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.muted {
  color: var(--color-text-muted);
}
</style>
