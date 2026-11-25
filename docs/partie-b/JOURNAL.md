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

### Phase 2 — Suite : fonctionnalités financières, dashboards et IA

Réalisé (deux agents en parallèle, chacun dans son worktree git, périmètres de dossiers exclusifs) :

- Factures (liste, détail, correction, validation), import PDF avec provenance par champ, transactions, import CSV, justificatifs manquants, rapprochements avec confirmation humaine, allocations analytiques, cartes, collaborateurs, catégories, centres de coûts.
- Dashboards organisation et entité, graphiques SVG maison, budgets, abonnements et échéances, analyses IA, consommation et quotas IA.

### Phase 3 — Intégration

- Fusion des trois branches ; seul conflit : la configuration Playwright, modifiée à l'identique de chaque côté.
- Défaut révélé par la fusion : une erreur simulée « une seule fois » était consommée par la coque (qui charge la liste des entités) avant d'atteindre l'écran visé. D'abord contourné dans le test, puis corrigé à la source (opérations de fond exemptées, décision D18).
- Contrôle visuel des écrans assemblés à 1280 et 375 px ; total consolidé du dashboard (8 456,78 €) recoupé à la main avec les deux lectures par entité.

### Phase 4 — Contre-audit indépendant

Un agent QA, qui n'a écrit aucune fonctionnalité et avait préparé son plan de tests à partir du seul cahier des charges, a audité le code réel : [AUDIT_QA.md](AUDIT_QA.md).

- 29 constats : 0 bloquant, 7 majeurs, 18 mineurs, 4 cosmétiques. Le calcul financier tenait ; les défauts étaient aux jonctions entre écrans écrits séparément.
- Constats majeurs : compteurs du dashboard menant à des listes non filtrées ; totaux d'un utilisateur limité incluant des entités invisibles ; listes filtrées sur « payé par » alors que le dashboard lit « imputé à » ; facture non marquée payée après rapprochement ; redirection silencieuse au lieu d'« Accès refusé » ; promesse de « saisie manuelle » sans fonction correspondante ; collaborateur voyant les dépenses nominatives de ses collègues.
- Leçon retenue : un test annoncé vert (« un manager ne voit que son entité ») ne passait que par effet de timing dans la suite complète. Depuis, la suite est lancée plusieurs fois de suite et fichier par fichier.
- Les défauts ont été matérialisés par 23 tests en « échec attendu », redevenus des tests normaux au fil des corrections, sans affaiblir d'assertion (vérifié par l'agent QA sur l'historique git).

Corrections : d'abord la couche commune (règles de visibilité, services, simulateur d'erreurs), puis les écrans en parallèle. Nouvelles décisions D14 à D20 dans [DECISIONS.md](DECISIONS.md).

Contre-vérification : 25 constats corrigés, 3 partiellement, et 6 nouveaux constats dont une régression majeure née de deux arbitrages combinés (facture « payée » après rapprochement + facture payée non modifiable = données extraites par l'IA figées sans relecture). Corrigé par la décision D20 : seule une facture validée peut être rapprochée.

### Phase 5 — Validation finale (25 novembre 2026)

Commandes relancées par l'orchestrateur sur l'état fusionné :

- `npm run typecheck`, `npm run lint`, `npm run build` : aucune erreur.
- `npm run test` : 357 tests réussis (41 fichiers).
- `npm run e2e` : 85 tests réussis, deux passages consécutifs ; aucun test en échec attendu restant.
- Responsive : aucun débordement horizontal sur 30 routes à 360, 768 et 1280 px. Accessibilité : aucune violation grave axe-core.
- Aucun appel réseau sortant sur le parcours complet (interception Playwright), aucun secret dans le frontend.

Dette connue et assumée :

- Duplications entre écrans écrits séparément : deux chargeurs de référentiels, trois enveloppes de chargement ; `features/transactions/shared` sert de module partagé à d'autres domaines.
- Champs date natifs dépendants de la langue du navigateur (un rappel jj/mm/aaaa est affiché).
- Adaptateurs HTTP jamais exécutés contre un vrai backend.
- Non testé : Firefox, Safari, lecteurs d'écran, manager rattaché à plusieurs entités.

À valider par le groupe : matrice des droits par rôle, noms/prix/quotas des deux offres, choix des quatre erreurs simulables, format du CSV, durées légales de conservation, correspondance exacte O1 à O7.
