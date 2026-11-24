<script setup lang="ts">
/**
 * Page publique « Confidentialité et transparence IA ».
 * Contenu statique et volontairement prudent : aucune durée de conservation ni aucun nom de
 * fournisseur d'IA n'est inventé (à préciser par le groupe).
 */
import AiProvenanceBadge from '@/components/ui/AiProvenanceBadge.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import { AI_PROVENANCE, AI_PROVENANCE_ORDER } from '@/components/ui/catalog'
import { RouteName } from '@/router/routeNames'

const sections = [
  { id: 'donnees', title: 'Données traitées' },
  { id: 'ia', title: 'Ce que fait l’IA' },
  { id: 'provenance', title: 'Provenance des informations' },
  { id: 'envoi', title: 'Données transmises au service d’IA' },
  { id: 'conservation', title: 'Conservation' },
  { id: 'droits', title: 'Vos droits' },
  { id: 'demo', title: 'Mode démonstration' },
]
</script>

<template>
  <div class="privacy">
    <header class="privacy__head">
      <p class="privacy__eyebrow">Confidentialité</p>
      <h1 class="privacy__title">Confidentialité et transparence IA</h1>
      <p class="privacy__lead">
        Comment CashLens traite vos données et comment l’intelligence artificielle intervient dans
        l’application.
      </p>
    </header>

    <div class="privacy__layout">
      <nav class="toc" aria-label="Sommaire">
        <p class="toc__title">Sommaire</p>
        <ol class="toc__list">
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`">{{ s.title }}</a>
          </li>
        </ol>
      </nav>

      <article class="prose">
        <BaseAlert tone="info" title="Document provisoire">
          Ce texte décrit le fonctionnement prévu de CashLens dans le cadre d’un projet scolaire. Il
          sera complété par le groupe avant toute mise en service réelle.
        </BaseAlert>

        <section id="donnees" class="prose__section">
          <h2>Données traitées</h2>
          <ul>
            <li>
              Identité professionnelle des membres : nom, adresse e-mail, rôle, entités de
              rattachement.
            </li>
            <li>
              Pièces de dépenses : factures (fournisseur, lignes, dates, montants, TVA),
              transactions et catégories.
            </li>
            <li>
              Cartes de paiement, identifiées uniquement par leurs
              <strong>quatre derniers chiffres</strong> : aucun numéro complet ni cryptogramme n’est
              demandé.
            </li>
            <li>Budgets, imputations analytiques, abonnements fournisseurs et échéances.</li>
            <li>
              Journal d’utilisation de l’IA : fonctionnalité utilisée, nombre de tokens, coût
              estimé.
            </li>
          </ul>
          <p>
            Ces données servent uniquement à organiser et analyser les dépenses de votre
            organisation.
          </p>
        </section>

        <section id="ia" class="prose__section">
          <h2>Ce que fait l’IA</h2>
          <p>Un service d’IA externe assiste les utilisateurs pour&nbsp;:</p>
          <ul>
            <li>
              extraire d’une facture PDF textuelle le fournisseur, les lignes, les dates, les
              montants et une catégorie&nbsp;;
            </li>
            <li>proposer des rapprochements entre une facture et un paiement&nbsp;;</li>
            <li>
              signaler des anomalies, des doublons potentiels, des hausses de prix, des abonnements
              redondants ou des pistes d’optimisation.
            </li>
          </ul>
          <p>
            <strong>Ce que l’IA ne fait pas</strong>&nbsp;: elle ne valide rien et n’enregistre rien
            seule. Toute suggestion doit être confirmée par une personne autorisée&nbsp;; les
            montants enregistrés sont vérifiés et calculés par le serveur (dans la
            démonstration&nbsp;: par les services simulés).
          </p>
          <p>
            Si le service d’IA est indisponible ou si le quota de votre offre est atteint, vous
            pouvez saisir une facture vous-même et rapprocher les paiements manuellement.
          </p>
        </section>

        <section id="provenance" class="prose__section">
          <h2>Provenance des informations</h2>
          <p>Chaque information affichée indique son origine&nbsp;:</p>
          <dl class="legend">
            <div v-for="kind in AI_PROVENANCE_ORDER" :key="kind" class="legend__row">
              <dt><AiProvenanceBadge :provenance="kind" /></dt>
              <dd>{{ AI_PROVENANCE[kind].description }}</dd>
            </div>
          </dl>
        </section>

        <section id="envoi" class="prose__section">
          <h2>Données transmises au service d’IA</h2>
          <p>
            Avec le service d’IA réel, seul le contenu nécessaire à la tâche demandée serait
            transmis&nbsp;: le texte d’une facture pour son extraction, ou les caractéristiques
            d’une facture et de paiements candidats pour un rapprochement, sans donnée bancaire
            sensible. La démonstration, elle, n’envoie rien&nbsp;: l’extraction y est simulée.
          </p>
          <p>
            Le choix du service d’IA et ses conditions de traitement sont en cours de validation par
            le groupe.
          </p>
        </section>

        <section id="conservation" class="prose__section">
          <h2>Conservation</h2>
          <p>
            Les données sont conservées tant que votre organisation utilise CashLens. Certaines
            pièces peuvent devoir être conservées pour des obligations légales&nbsp;; la durée sera
            précisée par le groupe.
          </p>
        </section>

        <section id="droits" class="prose__section">
          <h2>Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement
            et de portabilité de vos données personnelles. Dans l’application, la page
            <strong>Confidentialité et données</strong> permet d’exporter vos données et de demander
            leur suppression.
          </p>
        </section>

        <section id="demo" class="prose__section">
          <h2>Mode démonstration</h2>
          <p>
            La version de démonstration utilise exclusivement des données fictives. La connexion est
            simulée, aucun appel n’est fait à un service d’IA réel et aucune donnée n’est envoyée à
            l’extérieur de votre navigateur. Les extractions affichées sont simulées et annoncées
            comme telles.
          </p>
          <p class="prose__cta">
            <RouterLink :to="{ name: RouteName.Login, query: { demo: '1' } }"
              >Essayer la démonstration</RouterLink
            >
          </p>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.privacy {
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--space-10) var(--page-gutter) 0;
}

.privacy__eyebrow {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.privacy__title {
  margin-top: var(--space-2);
  font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem);
  letter-spacing: -0.02em;
}

.privacy__lead {
  max-width: 40rem;
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
}

.privacy__layout {
  display: grid;
  gap: var(--space-8);
  margin-top: var(--space-10);
}

@media (min-width: 1024px) {
  .privacy__layout {
    grid-template-columns: 14rem 1fr;
    align-items: start;
  }

  .toc {
    position: sticky;
    top: 5.5rem;
  }
}

.toc {
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.toc__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.toc__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-left: var(--space-5);
  font-size: var(--font-size-sm);
}

.prose {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  min-width: 0;
  max-width: 46rem;
}

.prose__section {
  scroll-margin-top: 5.5rem;
}

.prose h2 {
  font-size: var(--font-size-xl);
}

.prose p,
.prose ul {
  margin-top: var(--space-3);
  line-height: 1.65;
}

.prose ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-left: var(--space-5);
}

.legend {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.legend__row {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.legend__row + .legend__row {
  border-top: 1px solid var(--color-border-subtle);
}

@media (min-width: 640px) {
  .legend__row {
    grid-template-columns: 11rem 1fr;
    align-items: center;
  }
}

.legend dd {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.prose__cta a {
  font-weight: var(--font-weight-semibold);
}
</style>
