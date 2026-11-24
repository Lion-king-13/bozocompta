<script setup lang="ts">
/**
 * Haut de la landing : promesse, appels à l'action et aperçu illustratif de l'application.
 * L'aperçu est construit en HTML (pas une image) avec des chiffres fictifs, annoncés comme tels.
 */
import AiProvenanceBadge from '@/components/ui/AiProvenanceBadge.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { RouteName } from '@/router/routeNames'

const bars = [
  { label: 'Belgique', value: '31 480 €', width: 72, color: 'var(--chart-cat-1)' },
  { label: 'France', value: '16 750 €', width: 38, color: 'var(--chart-cat-2)' },
]
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__inner">
      <div class="hero__text">
        <p class="hero__eyebrow">Gestion des dépenses d’entreprise</p>
        <h1 id="hero-title" class="hero__title">
          Sachez qui dépense quoi, pour quelle entité et pourquoi.
        </h1>
        <p class="hero__lead">
          CashLens centralise vos factures, cartes, transactions et budgets. L’IA extrait les
          données et propose les rapprochements&nbsp;; vous gardez la décision finale.
        </p>
        <div class="hero__actions">
          <RouterLink
            :to="{ name: RouteName.Login, query: { demo: '1' } }"
            class="cta cta--primary"
            data-testid="cta-demo"
          >
            Essayer la démo
            <BaseIcon name="arrow-right" :size="18" />
          </RouterLink>
          <RouterLink :to="{ name: RouteName.Landing, hash: '#offres' }" class="cta cta--secondary">
            Voir les offres
          </RouterLink>
        </div>
        <p class="hero__note">
          <BaseIcon name="info" :size="16" />
          Démonstration avec des données fictives. Aucune inscription réelle requise.
        </p>
      </div>

      <!-- Aperçu illustratif : décoratif pour les lecteurs d'écran, résumé dans le texte alternatif -->
      <figure class="preview">
        <div class="preview__window" aria-hidden="true">
          <div class="preview__chrome">
            <span /><span /><span />
            <p>Tableau de bord — Organisation consolidée</p>
          </div>
          <div class="preview__body">
            <div class="preview__kpis">
              <div class="preview__kpi">
                <p class="preview__label">Dépenses du mois</p>
                <p class="preview__value">48 230 €</p>
                <p class="preview__delta">
                  <BaseIcon name="arrow-up" :size="12" /> En hausse de 12,4 %
                </p>
              </div>
              <div class="preview__kpi">
                <p class="preview__label">Factures à valider</p>
                <p class="preview__value">4</p>
                <p class="preview__muted">dont 2 extraites par l’IA</p>
              </div>
            </div>
            <div class="preview__card">
              <p class="preview__card-title">Dépenses imputées par entité</p>
              <div v-for="bar in bars" :key="bar.label" class="preview__bar-row">
                <span class="preview__bar-label">{{ bar.label }}</span>
                <span class="preview__bar-track">
                  <span
                    class="preview__bar"
                    :style="{ width: `${bar.width}%`, background: bar.color }"
                  />
                </span>
                <span class="preview__bar-value">{{ bar.value }}</span>
              </div>
            </div>
            <div class="preview__card preview__suggestion">
              <div class="preview__suggestion-head">
                <AiProvenanceBadge provenance="suggested" size="sm" />
                <StatusBadge status="duplicate" size="sm" />
              </div>
              <p class="preview__suggestion-text">
                Deux abonnements Figma semblent redondants entre la Belgique et la France.
              </p>
            </div>
          </div>
        </div>
        <figcaption class="preview__caption">
          Aperçu illustratif du tableau de bord (données fictives) : dépenses totales, dépenses par
          entité, factures à valider et suggestions de l’IA.
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.hero {
  overflow: hidden;
  background:
    radial-gradient(60rem 30rem at 85% -10%, var(--palette-petrol-100), transparent 60%),
    linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%);
  border-bottom: 1px solid var(--color-border-subtle);
}

.hero__inner {
  display: grid;
  gap: var(--space-10);
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--space-12) var(--page-gutter) var(--space-16);
}

.hero__eyebrow {
  display: inline-block;
  margin-bottom: var(--space-4);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-primary-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.hero__title {
  max-width: 36rem;
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-bold);
  line-height: 1.08;
  letter-spacing: -0.025em;
}

.hero__lead {
  max-width: 34rem;
  margin-top: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-normal);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 3rem;
  padding: 0 var(--space-6);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.cta:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.cta--primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-sm);
}

.cta--primary:hover {
  background: var(--color-primary-hover);
}

.cta--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.cta--secondary:hover {
  border-color: var(--color-border-strong);
}

.hero__note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* ---- Aperçu */
.preview {
  margin: 0;
  min-width: 0;
}

.preview__window {
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-bg);
  box-shadow: var(--shadow-lg);
}

.preview__chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-sidebar-bg);
}

.preview__chrome span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.25);
}

.preview__chrome p {
  margin-left: var(--space-3);
  overflow: hidden;
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__body {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.preview__kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.preview__kpi,
.preview__card {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.preview__label,
.preview__card-title {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.preview__value {
  margin-top: 2px;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.preview__delta {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--color-danger-text);
  font-size: var(--font-size-xs);
}

.preview__muted {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.preview__card-title {
  margin-bottom: var(--space-3);
}

.preview__bar-row {
  display: grid;
  grid-template-columns: 4.5rem 1fr auto;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}

.preview__bar-row + .preview__bar-row {
  margin-top: var(--space-2);
}

.preview__bar-track {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
}

.preview__bar {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
}

.preview__bar-value {
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-semibold);
}

.preview__suggestion-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.preview__suggestion-text {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}

.preview__caption {
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  text-align: center;
}

@media (min-width: 1024px) {
  .hero__inner {
    grid-template-columns: 1.05fr 1fr;
    align-items: center;
    gap: var(--space-12);
    padding-top: var(--space-16);
    padding-bottom: var(--space-16);
  }
}
</style>
