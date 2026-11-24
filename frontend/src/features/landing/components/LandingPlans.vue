<script setup lang="ts">
/**
 * Les deux paliers d'offre, lus depuis `config/plans.ts` (aucun prix écrit en dur ici).
 * Tarifs et quotas non validés : chaque prix porte la mention « tarif indicatif ».
 */
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { PLANS } from '@/config/plans'
import { formatCents } from '@/core/money'
import { RouteName } from '@/router/routeNames'
import SectionHeading from './SectionHeading.vue'

const formatNumber = (n: number) => new Intl.NumberFormat('fr-BE').format(n)
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)
</script>

<template>
  <section id="offres" class="plans" aria-labelledby="plans-title">
    <div class="plans__inner">
      <SectionHeading
        id="plans-title"
        eyebrow="Offres"
        title="Deux formules, selon la taille de votre organisation"
        lead="Tarifs indicatifs pendant la phase de démonstration."
      />

      <p v-if="PLANS.length === 0" class="plans__empty">Nos offres seront bientôt disponibles.</p>

      <div v-else class="plans__grid">
        <article
          v-for="plan in PLANS"
          :key="plan.id"
          class="plan"
          :class="{ 'plan--featured': plan.maxEntities > 1 }"
          data-testid="plan-card"
          :aria-labelledby="`plan-${plan.id}`"
        >
          <div class="plan__head">
            <h3 :id="`plan-${plan.id}`" class="plan__name">{{ plan.name }}</h3>
            <span v-if="plan.maxEntities > 1" class="plan__tag">Multi-entités</span>
          </div>
          <p class="plan__tagline">{{ plan.tagline }}</p>

          <p class="plan__price">
            <span class="plan__amount" data-testid="plan-price">{{
              formatCents(plan.monthlyPriceCents)
            }}</span>
            <span class="plan__period">HT / mois</span>
          </p>
          <p class="plan__indicative">Tarif indicatif, non contractuel</p>

          <ul class="plan__features">
            <li>
              <BaseIcon name="building" :size="18" />
              {{ plan.maxEntities }} {{ plural(plan.maxEntities, 'entité', 'entités') }}
            </li>
            <li>
              <BaseIcon name="users" :size="18" />
              Jusqu’à {{ plan.maxUsers }} utilisateurs
            </li>
            <li>
              <BaseIcon name="bolt" :size="18" />
              {{ formatNumber(plan.includedAiTokensPerMonth) }} tokens IA inclus par mois
            </li>
            <li v-for="feature in plan.features" :key="feature">
              <BaseIcon name="check" :size="18" />
              {{ feature }}
            </li>
          </ul>

          <p v-if="plan.aiHardLimit" class="plan__limit">
            Au-delà du quota, les fonctions IA sont suspendues jusqu’au mois suivant&nbsp;; la
            saisie manuelle reste disponible.
          </p>

          <RouterLink
            :to="{ name: RouteName.SignUp, query: { plan: plan.id } }"
            class="plan__cta"
            :class="{ 'plan__cta--primary': plan.maxEntities > 1 }"
          >
            Choisir {{ plan.name }}
          </RouterLink>
        </article>
      </div>

      <p class="plans__note">
        Prix, quotas et contenu des formules sont en cours de validation et peuvent évoluer.
      </p>
    </div>
  </section>
</template>

<style scoped>
.plans {
  scroll-margin-top: 5rem;
}

.plans__inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--space-16) var(--page-gutter);
}

.plans__grid {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-10);
}

@media (min-width: 768px) {
  .plans__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.plan {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.plan--featured {
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-md);
}

.plan__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.plan__name {
  font-size: var(--font-size-xl);
}

.plan__tag {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.plan__tagline {
  margin-top: var(--space-2);
  min-height: 3em;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plan__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.plan__amount {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.plan__period {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plan__indicative {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-style: italic;
}

.plan__features {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: var(--space-5) 0 0;
  border-top: 1px solid var(--color-border-subtle);
  list-style: none;
  font-size: var(--font-size-sm);
}

.plan__features li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.plan__features svg {
  margin-top: 1px;
  color: var(--color-primary);
}

.plan__limit {
  margin-top: var(--space-5);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.plan__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  margin-top: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.plan__cta:hover {
  border-color: var(--color-border-strong);
}

.plan__cta--primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.plan__cta--primary:hover {
  background: var(--color-primary-hover);
}

.plan__cta:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.plans__note,
.plans__empty {
  margin-top: var(--space-6);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
