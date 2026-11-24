<script setup lang="ts">
/**
 * Landing page publique (textes : docs/partie-b/LANDING_CONTENU.md).
 * Aucun chiffre de performance inventé, aucun témoignage : projet scolaire en démonstration.
 */
import AiProvenanceBadge from '@/components/ui/AiProvenanceBadge.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { IconName } from '@/components/ui/icons'
import type { AiProvenance } from '@/components/ui/types'
import { RouteName } from '@/router/routeNames'
import LandingHero from '../components/LandingHero.vue'
import LandingPlans from '../components/LandingPlans.vue'
import SectionHeading from '../components/SectionHeading.vue'

const promises: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'inbox',
    title: 'Tout au même endroit',
    text: 'Factures PDF, relevés de cartes et transactions bancaires réunis dans un seul espace, pour chaque entité de votre organisation.',
  },
  {
    icon: 'sparkle',
    title: 'Moins de saisie',
    text: 'L’IA lit vos factures et en extrait fournisseur, lignes, dates, montants et catégorie. Vous n’avez plus qu’à vérifier.',
  },
  {
    icon: 'chart',
    title: 'Une vue claire',
    text: 'Dépenses par entité, collaborateur, carte, catégorie, département ou projet, comparées à vos budgets.',
  },
]

const steps = [
  { title: 'Importez', text: 'Déposez une facture PDF ou un export CSV de vos transactions.' },
  {
    title: 'L’IA extrait',
    text: 'Fournisseur, lignes, dates, montants et catégorie sont proposés automatiquement, avec leur provenance indiquée.',
  },
  {
    title: 'Vous validez',
    text: 'Vous corrigez si nécessaire, puis confirmez les données et les rapprochements entre factures et paiements.',
  },
  {
    title: 'Vous analysez',
    text: 'Tableaux de bord, budgets, abonnements et alertes se mettent à jour à partir des seules données validées.',
  },
]

const provenance: { kind: AiProvenance; text: string }[] = [
  { kind: 'suggested', text: 'une proposition, appliquée seulement si vous la confirmez.' },
  { kind: 'extracted', text: 'une valeur lue automatiquement dans un document, à vérifier.' },
  { kind: 'corrected', text: 'une valeur modifiée par un membre de votre équipe.' },
  { kind: 'validated', text: 'une valeur confirmée par un membre de votre équipe.' },
  { kind: 'recorded', text: 'une donnée financière définitive, utilisée pour les calculs.' },
]

const aiPoints: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'check-circle',
    title: 'Validation humaine obligatoire',
    text: 'Un rapprochement proposé ne devient définitif qu’après votre confirmation.',
  },
  {
    icon: 'search',
    title: 'Analyses expliquées',
    text: 'Anomalies, doublons potentiels, hausses de prix, abonnements redondants : chaque suggestion est expliquée et renvoie aux pièces concernées.',
  },
  {
    icon: 'bolt',
    title: 'Consommation visible',
    text: 'Les administrateurs et la finance consultent les tokens utilisés, le coût estimé et le quota restant du mois.',
  },
  {
    icon: 'pencil',
    title: 'Toujours une alternative',
    text: 'Si l’IA est indisponible ou si votre quota est atteint, vous pouvez saisir la facture vous-même et rapprocher les paiements manuellement.',
  },
]

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'receipt',
    title: 'Factures et extraction',
    text: 'Import de factures PDF textuelles, extraction des lignes, correction et validation.',
  },
  {
    icon: 'card',
    title: 'Transactions et cartes',
    text: 'Import CSV, cartes multiples par collaborateur, rattachées à leur entité.',
  },
  {
    icon: 'link',
    title: 'Rapprochement',
    text: 'Suggestions d’association entre factures et paiements, confirmées par vous.',
  },
  {
    icon: 'paperclip',
    title: 'Justificatifs manquants',
    text: 'Les paiements sans facture sont listés pour être complétés.',
  },
  {
    icon: 'wallet',
    title: 'Budgets et abonnements',
    text: 'Seuils d’alerte, budgets consommés et restants, échéances à venir.',
  },
  {
    icon: 'shield',
    title: 'Rôles et entités',
    text: 'Chaque membre voit les entités et les actions qui le concernent.',
  },
]

const privacy: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'card',
    title: 'Données minimales',
    text: 'Aucune donnée bancaire sensible : les cartes sont identifiées par leurs quatre derniers chiffres.',
  },
  {
    icon: 'sparkle',
    title: 'Transparence sur l’IA',
    text: 'La page Confidentialité indique quelles informations seraient transmises au service d’IA et pourquoi. La démonstration n’appelle aucun service d’IA réel.',
  },
  {
    icon: 'building',
    title: 'Isolation par organisation',
    text: 'Chaque membre ne voit que ce que son rôle et ses entités autorisent. En démonstration, ce filtrage est simulé ; le contrôle réel sera fait par le serveur.',
  },
  {
    icon: 'trash',
    title: 'Droit à l’effacement',
    text: 'Vous pouvez exporter ou supprimer vos données depuis l’application.',
  },
]

const faq = [
  {
    q: 'Les données de la démonstration sont-elles réelles ?',
    a: 'Non. Toutes les factures, transactions et personnes sont fictives. La connexion est simulée et aucune donnée n’est envoyée à un service externe.',
  },
  {
    q: 'L’IA peut-elle valider une facture à ma place ?',
    a: 'Non. L’IA propose des valeurs et des rapprochements ; seule une personne autorisée peut les valider.',
  },
  {
    q: 'Que se passe-t-il si l’IA se trompe ?',
    a: 'Chaque valeur extraite peut être corrigée avant validation. Une valeur corrigée est marquée « Corrigé » : on sait qu’elle ne vient pas de l’IA.',
  },
  {
    q: 'Puis-je gérer plusieurs sociétés ?',
    a: 'Oui, avec la formule multi-entités : chaque entité a ses cartes, ses budgets et son tableau de bord, et une vue consolidée réunit l’ensemble.',
  },
  {
    q: 'CashLens remplace-t-il mon logiciel comptable ?',
    a: 'Non. CashLens organise et analyse vos dépenses ; il ne tient pas la comptabilité générale.',
  },
]
</script>

<template>
  <div class="landing">
    <LandingHero />

    <!-- Le problème / la promesse -->
    <section id="produit" class="section" aria-labelledby="produit-title">
      <div class="section__inner">
        <SectionHeading
          id="produit-title"
          eyebrow="Produit"
          title="Vos dépenses sont dispersées. Vos décisions ne devraient pas l’être."
        />
        <div class="grid grid--3">
          <article v-for="item in promises" :key="item.title" class="tile">
            <span class="tile__icon"><BaseIcon :name="item.icon" :size="22" /></span>
            <h3 class="tile__title">{{ item.title }}</h3>
            <p class="tile__text">{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Comment ça marche -->
    <section id="fonctionnement" class="section section--alt" aria-labelledby="steps-title">
      <div class="section__inner">
        <SectionHeading
          id="steps-title"
          eyebrow="Fonctionnement"
          title="De la facture à l’analyse, en quatre étapes"
        />
        <ol class="steps">
          <li v-for="(step, index) in steps" :key="step.title" class="step">
            <span class="step__number" aria-hidden="true">{{ index + 1 }}</span>
            <h3 class="step__title">{{ step.title }}</h3>
            <p class="step__text">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Multi-entités et allocation (exemple obligatoire) -->
    <section id="multi-entites" class="section" aria-labelledby="entities-title">
      <div class="section__inner split">
        <div>
          <SectionHeading
            id="entities-title"
            eyebrow="Multi-entités"
            title="Une organisation, plusieurs entités, un seul total"
            align="left"
          />
          <p class="split__text">
            Une facture payée par l’entité belge peut concerner un projet en France. CashLens
            répartit la dépense entre plusieurs imputations analytiques, sans la dupliquer.
          </p>
          <p class="split__note">
            <BaseIcon name="info" :size="18" />
            Une seule facture, un seul paiement, plusieurs imputations. Aucune dépense
            supplémentaire, aucune écriture intersociétés.
          </p>
        </div>

        <figure class="allocation" aria-labelledby="allocation-caption">
          <figcaption id="allocation-caption" class="allocation__head">
            <span class="allocation__label">Exemple</span>
            <strong>Facture de matériel informatique : 3 000 €</strong>
            <span class="allocation__sub">Payée par Alice avec une carte de l’entité Belgique</span>
          </figcaption>
          <div class="allocation__bar" aria-hidden="true">
            <span class="allocation__seg allocation__seg--be" style="width: 60%">60 %</span>
            <span class="allocation__seg allocation__seg--fr" style="width: 40%">40 %</span>
          </div>
          <dl class="allocation__lines">
            <div class="allocation__line">
              <dt><span class="dot dot--be" aria-hidden="true" />Belgique</dt>
              <dd>60 % — 1 800 €</dd>
            </div>
            <div class="allocation__line">
              <dt><span class="dot dot--fr" aria-hidden="true" />Projet France</dt>
              <dd>40 % — 1 200 €</dd>
            </div>
            <div class="allocation__line allocation__line--total">
              <dt>Total consolidé</dt>
              <dd>3 000 €</dd>
            </div>
          </dl>
        </figure>
      </div>
    </section>

    <!-- IA sous contrôle -->
    <section id="ia" class="section section--dark" aria-labelledby="ia-title">
      <div class="section__inner">
        <header class="dark-head">
          <p class="dark-head__eyebrow">IA et transparence</p>
          <h2 id="ia-title" class="dark-head__title">
            L’IA vous assiste. Elle ne décide pas à votre place.
          </h2>
          <p class="dark-head__lead">
            Chaque information affichée indique d’où elle vient. Vous savez toujours ce qui a été
            proposé par l’IA et ce qui a été vérifié par une personne.
          </p>
        </header>

        <div class="ia">
          <ul class="ia__legend" aria-label="Les cinq provenances d’une donnée">
            <li v-for="item in provenance" :key="item.kind" class="ia__legend-item">
              <AiProvenanceBadge :provenance="item.kind" />
              <span>{{ item.text }}</span>
            </li>
          </ul>
          <div class="ia__points">
            <article v-for="point in aiPoints" :key="point.title" class="ia__point">
              <BaseIcon :name="point.icon" :size="22" />
              <div>
                <h3 class="ia__point-title">{{ point.title }}</h3>
                <p class="ia__point-text">{{ point.text }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- Fonctionnalités -->
    <section id="fonctionnalites" class="section" aria-labelledby="features-title">
      <div class="section__inner">
        <SectionHeading
          id="features-title"
          eyebrow="Fonctionnalités"
          title="Tout ce qu’il faut pour piloter vos dépenses"
        />
        <div class="grid grid--3">
          <article v-for="item in features" :key="item.title" class="tile tile--compact">
            <span class="tile__icon"><BaseIcon :name="item.icon" :size="20" /></span>
            <h3 class="tile__title">{{ item.title }}</h3>
            <p class="tile__text">{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <LandingPlans class="section--alt" />

    <!-- Confidentialité -->
    <section id="confidentialite" class="section" aria-labelledby="privacy-title">
      <div class="section__inner">
        <SectionHeading
          id="privacy-title"
          eyebrow="Confidentialité et RGPD"
          title="Vos données restent les vôtres"
        />
        <div class="grid grid--4">
          <article v-for="item in privacy" :key="item.title" class="tile tile--compact">
            <span class="tile__icon"><BaseIcon :name="item.icon" :size="20" /></span>
            <h3 class="tile__title">{{ item.title }}</h3>
            <p class="tile__text">{{ item.text }}</p>
          </article>
        </div>
        <p class="section__link">
          <RouterLink :to="{ name: RouteName.PublicPrivacy }">
            Lire la politique de confidentialité et de transparence IA
            <BaseIcon name="arrow-right" :size="16" />
          </RouterLink>
        </p>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="section section--alt" aria-labelledby="faq-title">
      <div class="section__inner section__inner--narrow">
        <SectionHeading
          id="faq-title"
          eyebrow="Questions fréquentes"
          title="Questions fréquentes"
        />
        <div class="faq">
          <details v-for="item in faq" :key="item.q" class="faq__item">
            <summary class="faq__question">
              {{ item.q }}
              <BaseIcon class="faq__chevron" name="chevron-down" :size="18" />
            </summary>
            <p class="faq__answer">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Appel final -->
    <section class="final" aria-labelledby="final-title">
      <div class="final__inner">
        <h2 id="final-title" class="final__title">Voyez CashLens en action</h2>
        <p class="final__text">
          Explorez la démonstration avec une organisation fictive présente en Belgique et en France.
        </p>
        <RouterLink :to="{ name: RouteName.Login, query: { demo: '1' } }" class="final__cta">
          Essayer la démo
          <BaseIcon name="arrow-right" :size="18" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  margin-bottom: calc(var(--space-16) * -1); /* le pied de page suit directement l'appel final */
}

.section {
  scroll-margin-top: 4.5rem;
}

.section--alt {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.section__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--space-16) var(--page-gutter);
}

.section__inner--narrow {
  max-width: 48rem;
}

.section__link {
  margin-top: var(--space-8);
  text-align: center;
}

.section__link a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-semibold);
}

/* ---- Grilles de tuiles */
.grid {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-10);
}

@media (min-width: 768px) {
  .grid--3,
  .grid--4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid--3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid--4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

.tile {
  padding: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.section--alt .tile {
  background: var(--color-bg);
}

.tile--compact {
  padding: var(--space-5);
}

.tile__icon {
  display: inline-flex;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.tile__title {
  margin-top: var(--space-4);
  font-size: var(--font-size-lg);
}

.tile__text {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* ---- Étapes */
.steps {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-10);
  padding: 0;
  list-style: none;
  counter-reset: none;
}

@media (min-width: 768px) {
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .steps {
    grid-template-columns: repeat(4, 1fr);
  }
}

.step {
  position: relative;
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
}

.step__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: var(--font-weight-bold);
}

.step__title {
  margin-top: var(--space-4);
  font-size: var(--font-size-lg);
}

.step__text {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* ---- Multi-entités */
.split {
  display: grid;
  gap: var(--space-10);
  align-items: center;
}

@media (min-width: 1024px) {
  .split {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-16);
  }
}

.split__text {
  margin-top: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
}

.split__note {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: var(--space-4);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  font-size: var(--font-size-sm);
}

.split__note svg {
  margin-top: 2px;
  color: var(--color-primary);
}

.allocation {
  margin: 0;
  padding: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.allocation__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.allocation__label {
  align-self: flex-start;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.allocation__head strong {
  font-size: var(--font-size-lg);
}

.allocation__sub {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.allocation__bar {
  display: flex;
  gap: 2px;
  height: 2.25rem;
  margin-top: var(--space-5);
  overflow: hidden;
  border-radius: var(--radius-md);
}

.allocation__seg {
  display: flex;
  align-items: center;
  padding-left: var(--space-3);
  color: var(--color-text-inverse);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.allocation__seg--be,
.dot--be {
  background: var(--chart-cat-1);
}

.allocation__seg--fr,
.dot--fr {
  background: var(--chart-cat-2);
}

/* Texte blanc sur orange : contraste insuffisant → texte foncé */
.allocation__seg--fr {
  color: var(--color-text);
}

.allocation__lines {
  margin-top: var(--space-5);
}

.allocation__line {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border-subtle);
  font-variant-numeric: tabular-nums;
}

.allocation__line dt {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.allocation__line dd {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}

.allocation__line--total {
  border-bottom: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* ---- Section IA (fond foncé) */
.section--dark {
  background: var(--color-sidebar-bg);
  color: var(--color-text-inverse);
}

.dark-head {
  max-width: 44rem;
  margin: 0 auto;
  text-align: center;
}

.dark-head__eyebrow {
  margin-bottom: var(--space-3);
  color: var(--palette-amber-400);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.dark-head__title {
  color: var(--color-text-inverse);
  font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.dark-head__lead {
  margin-top: var(--space-4);
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-size-lg);
}

.ia {
  display: grid;
  gap: var(--space-6);
  margin-top: var(--space-10);
}

@media (min-width: 1024px) {
  .ia {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-10);
  }
}

.ia__legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  list-style: none;
}

.ia__legend-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.ia__legend-item + .ia__legend-item {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}

.ia__points {
  display: grid;
  gap: var(--space-5);
  align-content: center;
}

.ia__point {
  display: flex;
  gap: var(--space-4);
}

.ia__point > svg {
  margin-top: 2px;
  color: var(--palette-amber-400);
}

.ia__point-title {
  color: var(--color-text-inverse);
  font-size: var(--font-size-md);
}

.ia__point-text {
  margin-top: var(--space-1);
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-size-sm);
}

/* ---- FAQ */
.faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-8);
}

.faq__item {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 3.25rem;
  padding: var(--space-3) var(--space-4);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  list-style: none;
}

.faq__question::-webkit-details-marker {
  display: none;
}

.faq__question:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

.faq__chevron {
  flex-shrink: 0;
  transition: transform var(--duration-normal) var(--easing-standard);
}

.faq__item[open] .faq__chevron {
  transform: rotate(180deg);
}

.faq__answer {
  padding: 0 var(--space-4) var(--space-4);
  color: var(--color-text-secondary);
}

/* ---- Appel final */
.final {
  background: linear-gradient(135deg, var(--palette-petrol-700), var(--palette-petrol-900));
  color: var(--color-text-inverse);
}

.final__inner {
  max-width: 48rem;
  margin: 0 auto;
  padding: var(--space-16) var(--page-gutter);
  text-align: center;
}

.final__title {
  color: var(--color-text-inverse);
  font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
  font-weight: var(--font-weight-bold);
}

.final__text {
  margin-top: var(--space-3);
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-size-lg);
}

.final__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 3rem;
  margin-top: var(--space-8);
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.final__cta:hover {
  background: var(--color-primary-soft);
}

.final__cta:focus-visible {
  outline: 2px solid var(--color-focus-inverse);
  outline-offset: var(--focus-offset);
}
</style>
