<script setup lang="ts">
/**
 * Coque publique : landing, connexion, inscription, confidentialité, pages d'erreur.
 * En-tête avec ancres de la landing (menu repliable sur mobile) et pied de page.
 */
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/shell/BrandLogo.vue'
import DemoModeBanner from '@/components/shell/DemoModeBanner.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { RouteName } from '@/router/routeNames'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false)

const anchors = [
  { label: 'Produit', hash: '#produit' },
  { label: 'IA et transparence', hash: '#ia' },
  { label: 'Offres', hash: '#offres' },
  { label: 'Confidentialité', hash: '#confidentialite' },
]

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)
</script>

<template>
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <DemoModeBanner />

  <header class="header">
    <div class="header__inner">
      <RouterLink
        :to="{ name: RouteName.Landing }"
        class="header__brand"
        aria-label="CashLens — accueil"
      >
        <BrandLogo />
      </RouterLink>

      <button
        type="button"
        class="header__toggle"
        :aria-expanded="menuOpen"
        aria-controls="public-menu"
        @click="menuOpen = !menuOpen"
      >
        <BaseIcon :name="menuOpen ? 'x' : 'menu'" :size="22" />
        <span class="sr-only">{{ menuOpen ? 'Fermer le menu' : 'Ouvrir le menu' }}</span>
      </button>

      <div id="public-menu" class="header__menu" :class="{ 'is-open': menuOpen }">
        <nav aria-label="Sections de la page d'accueil">
          <ul class="header__links">
            <li v-for="a in anchors" :key="a.hash">
              <RouterLink :to="{ name: RouteName.Landing, hash: a.hash }" class="header__link">
                {{ a.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
        <div class="header__actions">
          <template v-if="auth.isAuthenticated">
            <RouterLink :to="{ name: RouteName.OrganizationDashboard }" class="btn btn--primary">
              Ouvrir l’application
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="{ name: RouteName.Login }" class="btn btn--secondary"
              >Se connecter</RouterLink
            >
            <RouterLink
              :to="{ name: RouteName.Login, query: { demo: '1' } }"
              class="btn btn--primary"
            >
              Essayer la démo
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>

  <main id="contenu" class="main" tabindex="-1">
    <!-- Contenu fourni en slot par les pages hors layout (404), sinon la route enfant -->
    <slot><RouterView /></slot>
  </main>

  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <BrandLogo />
        <p>Gestion intelligente des dépenses d’entreprise.</p>
      </div>
      <nav class="footer__cols" aria-label="Pied de page">
        <div>
          <p class="footer__title">Produit</p>
          <ul>
            <li>
              <RouterLink :to="{ name: RouteName.Landing, hash: '#fonctionnalites' }"
                >Fonctionnalités</RouterLink
              >
            </li>
            <li>
              <RouterLink :to="{ name: RouteName.Landing, hash: '#offres' }">Offres</RouterLink>
            </li>
          </ul>
        </div>
        <div>
          <p class="footer__title">Transparence</p>
          <ul>
            <li>
              <RouterLink :to="{ name: RouteName.Landing, hash: '#ia' }"
                >IA et transparence</RouterLink
              >
            </li>
            <li>
              <RouterLink :to="{ name: RouteName.PublicPrivacy }">Confidentialité</RouterLink>
            </li>
          </ul>
        </div>
        <div>
          <p class="footer__title">Accès</p>
          <ul>
            <li><RouterLink :to="{ name: RouteName.Login }">Se connecter</RouterLink></li>
            <li>
              <RouterLink :to="{ name: RouteName.SignUp }"
                >Créer un compte de démonstration</RouterLink
              >
            </li>
          </ul>
        </div>
      </nav>
    </div>
    <p class="footer__note">CashLens — projet scolaire. Démonstration avec des données fictives.</p>
  </footer>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: rgb(255 255 255 / 0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border-subtle);
}

.header__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  max-width: var(--page-max-width);
  min-height: 4rem;
  margin: 0 auto;
  padding: 0 var(--page-gutter);
}

.header__brand {
  display: inline-flex;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  text-decoration: none;
}

.header__brand:focus-visible,
.header__toggle:focus-visible,
.header__link:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.header__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target);
  height: var(--touch-target);
  margin-left: auto;
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text);
}

.header__menu {
  display: none;
  flex-basis: 100%;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0 var(--space-5);
}

.header__menu.is-open {
  display: flex;
}

.header__links {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}

.header__link {
  display: flex;
  align-items: center;
  min-height: var(--touch-target);
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.header__link:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.header__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Liens d'action au style des boutons (RouterLink, pas de <button>) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-height);
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.btn:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

.btn--primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.btn--primary:hover {
  background: var(--color-primary-hover);
}

.btn--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn--secondary:hover {
  border-color: var(--color-border-strong);
}

@media (min-width: 1024px) {
  .header__toggle {
    display: none;
  }

  .header__menu,
  .header__menu.is-open {
    display: flex;
    flex: 1;
    flex-basis: auto;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 0 var(--space-8);
  }

  .header__links {
    flex-direction: row;
    gap: var(--space-1);
  }

  .header__link {
    min-height: 2.5rem;
    padding: 0 var(--space-3);
  }

  .header__actions {
    flex-direction: row;
  }
}

.main:focus {
  outline: none;
}

.footer {
  margin-top: var(--space-16);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-subtle);
}

.footer__inner {
  display: grid;
  gap: var(--space-8);
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--space-10) var(--page-gutter) var(--space-6);
}

.footer__brand p {
  margin-top: var(--space-3);
  max-width: 20rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.footer__cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--space-6);
}

.footer__title {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.footer__cols ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
  font-size: var(--font-size-sm);
}

.footer__cols a {
  color: var(--color-text);
  text-decoration: none;
}

.footer__cols a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.footer__note {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--space-6);
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

@media (min-width: 768px) {
  .footer__inner {
    grid-template-columns: 1fr 2fr;
  }
}
</style>
