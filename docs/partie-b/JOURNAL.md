# Journal de développement — partie B (frontend)

Journal tenu au fil de l'eau pour le carnet individuel : décisions, difficultés, fonctionnalités réalisées et preuves de tests.
Le développement est assisté par des agents IA spécialisés coordonnés par un orchestrateur ; chaque entrée indique ce qui a été vérifié et comment, pour que le responsable de la partie B puisse expliquer et défendre chaque choix à l'oral.

Les décisions métier détaillées sont dans [DECISIONS.md](DECISIONS.md), l'architecture dans [ARCHITECTURE.md](ARCHITECTURE.md), le suivi des exigences dans [MATRICE_EXIGENCES.md](MATRICE_EXIGENCES.md).

## 24 novembre 2026 — Démarrage

### Contexte

- Repository vide ; les parties A (backend FastAPI) et C (infrastructure) n'ont pas commencé.
- Cahier des charges enregistré dans [`docs/frontend-requirements.md`](../frontend-requirements.md).
- Organisation : un orchestrateur, puis cinq rôles spécialisés (architecture, design system/UX, fonctionnalités financières, dashboards/IA, QA indépendant), chacun avec un périmètre de dossiers exclusif.

### Phase 1 — Fondations

Réalisé :

- Projet `frontend/` : Vue 3, TypeScript strict, Vite, vue-router, Pinia, Vitest, Playwright, ESLint, Prettier.
- Modèles métier partagés (`src/domain/`), un calcul unique des dépenses (`computeSpendReport`) réutilisé par tous les écrans.
- Une interface de service par domaine, avec une implémentation mock en mémoire et un squelette HTTP ; bascule par `VITE_API_MODE` en un seul point (`src/services/index.ts`).
- Jeu de données fictif déterministe, date de démonstration figée (`DEMO_TODAY`).
- Session et rôles simulés, garde de route, page d'accès refusé.
- Simulateur d'erreurs : fichier invalide, service IA indisponible, quota IA dépassé, API indisponible (panneau « Mode démo » ou paramètre `?demoError=`).
- Design system : tokens CSS, 21 composants réutilisables, documentation.

Décisions structurantes (provisoires, à valider par le groupe) :

- Montants en centimes entiers, pourcentages en points de base, répartition par plus grand reste : aucun flottant, aucun centime perdu.
- L'unité de dépense est la transaction. Une facture n'ajoute rien aux totaux ; le rapprochement n'est qu'un lien. C'est ce qui garantit l'absence de double comptage.
- Deux lectures toujours libellées : « payé par » (entité de la carte) et « imputé à » (ventilation analytique).
- Un seul modèle « centre de coûts » typé département ou projet.
- CSS à base de variables, sans Tailwind ni librairie de composants ; graphiques SVG maison, sans librairie : moins de dépendances, code explicable.
- Pas de faux serveur : les vues ne connaissent que les interfaces de services, que le backend A remplacera.

Preuves (commandes relancées par l'orchestrateur sur l'état commité, pas seulement déclarées par l'agent) :

- `npm run typecheck`, `npm run lint` : aucune erreur.
- `npm run test` : 91 tests réussis.
- `npm run build` : réussi.
- `npm run e2e` : 4 tests réussis.
- Exemple obligatoire couvert par les tests : facture de 3 000 € payée par Alice (carte belge), total consolidé compté une seule fois, Belgique 1 800 € imputés / 3 000 € payés, France 1 200 € imputés / 0 € payé.

Difficultés :

- Le cahier des charges laissait ouvertes plusieurs questions (qu'est-ce qu'une « dépense », entité payeuse ou entité imputée, TTC ou HT, rôles). Elles ont été relevées par l'agent QA à partir du seul cahier des charges, tranchées provisoirement et consignées dans DECISIONS.md.
- Le premier modèle rattachait les allocations aux factures sur une base HT ; il a été réaligné sur les transactions (montant payé) pour respecter la règle « une seule dépense ».

### Phase 2 — Développement parallèle (en cours)

Réalisé côté interface commune et partie publique :

- Layout applicatif (barre latérale, tiroir mobile, sélecteur de périmètre, menu utilisateur, bandeau et panneau de mode démonstration, navigation filtrée par permissions).
- Landing page avec deux offres lues depuis `src/config/plans.ts` (tarifs indicatifs, non validés).
- Connexion et inscription simulées, annoncées comme telles.
- Confidentialité et transparence IA (publique), confidentialité et suppression des données (authentifiée), paramètres, pages 403 et 404.

Preuves : 130 tests unitaires et de composants réussis, 18 tests de bout en bout réussis (relancés trois fois de suite), captures d'écran contrôlées à 1280 et 375 px.

Difficulté rencontrée : les suites de bout en bout lancées en parallèle dans plusieurs worktrees partageaient le même port, si bien qu'une suite pouvait s'exécuter contre le build d'une autre. Corrigé par un port configurable (`E2E_PORT`).

En cours : fonctionnalités financières ; dashboards, budgets et IA. Viendront ensuite l'intégration, le contre-audit indépendant et la validation finale.
