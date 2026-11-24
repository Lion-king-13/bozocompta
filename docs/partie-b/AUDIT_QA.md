# Partie B — Contre-audit QA indépendant (phase 4)

> Auteur : agent 5 « QA, contre-audit et intégration », indépendant des agents qui ont écrit le code.
> Branche auditée : `sasha/eager-cannon-p7l6s0`, à partir de `bc7166b`.
> Référentiels : [`frontend-requirements.md`](../frontend-requirements.md), [DECISIONS.md](DECISIONS.md) (D1–D13, H1–H12),
> [ARCHITECTURE.md](ARCHITECTURE.md), [PARCOURS_UX.md](PARCOURS_UX.md), [CONTRATS_API.md](CONTRATS_API.md).
> Règle suivie : **aucun code de fonctionnalité n'a été modifié.** Un test qui révèle un défaut réel reste
> dans la suite, marqué `it.fails` (Vitest) ou `test.fail` (Playwright), avec l'identifiant du constat.
> Il passera au vert quand le défaut sera corrigé. Aucune assertion n'a été affaiblie.

## 1. Synthèse

| Gravité | Nombre | Constats |
|---------|--------|----------|
| Bloquant | 0 | — |
| Majeur | 7 | QA-01, QA-03, QA-05, QA-11, QA-16, QA-18, QA-20 |
| Mineur | 18 | QA-02, QA-04, QA-06 à QA-10, QA-12 à QA-15, QA-17, QA-19, QA-21, QA-22, QA-24, QA-25, QA-28 |
| Cosmétique | 4 | QA-23, QA-26, QA-27, QA-29 |

Le cœur financier tient. Le calcul unique des dépenses, l'exemple §5, les arrondis et la neutralité des ventilations sont vérifiés sur tous les rôles et tous les périmètres, y compris après mutation (§3.1). Les problèmes se trouvent **aux jonctions** entre les écrans écrits séparément :
- les liens du tableau de bord vers les listes ne transmettent pas leurs filtres ;
- « payé par » et « imputé à » sont mélangés selon l'écran ;
- confirmer un rapprochement ne met pas à jour la facture ;
- le périmètre d'un utilisateur limité fuit dans la vue consolidée ;
- des promesses faites dans l'interface ne sont pas tenues (saisie manuelle).

### Suites après ajouts (mesurées le 24/11/2026 sur l'état commité)

| Suite | Avant l'audit | Après | Dont échecs attendus (défauts ouverts) |
|-------|---------------|-------|-----------------------------------------|
| Vitest | 210 tests, 33 fichiers | **264 tests, 34 fichiers**, tous verts | **12** `it.fails` |
| Playwright | 38 tests | **71 tests**, tous verts | **11** `test.fail` |
| `npm run lint`, `npm run typecheck`, `npm run build` | OK | OK | — |

Fichiers ajoutés :
- `frontend/src/qa/invariants.spec.ts` : invariants financiers sur le vrai jeu de données et les vrais services ;
- `frontend/e2e/qa-cross-screen.spec.ts` : parcours inter-écrans, erreurs, rôles, périmètre, interception réseau ;
- `frontend/e2e/qa-responsive-a11y.spec.ts` : 3 largeurs sur toutes les routes, axe-core, clavier.

Une devDependency a été ajoutée : `@axe-core/playwright@4.10.2`.

Commande e2e : `E2E_PORT=4473 npx playwright test --trace off`. ⚠ Le serveur de preview réutilisé doit servir un build `--mode e2e` (latence 0). Après un `npm run build`, le build de production a une latence de 300 ms et 4 tests échouent.

## 2. Constats

Format de chaque fiche : gravité · propriétaire probable · fichier:ligne · preuve · impact · correction · test de vérification.

### Majeurs

#### QA-01 — Les compteurs et KPI du tableau de bord mènent à des listes qui ignorent leurs filtres
- **Gravité** : majeur · **Propriétaire** : Finances (listes), Dashboards (contrat des liens)
- **Où** :
  - `features/dashboard/actionCounters.ts` et `DashboardContent.vue:123,167` passent `?status=to_review`, `?status=suggested`, `?direction=debit&bookedFrom=&bookedTo=` et `?entityId=` ;
  - `features/invoices/views/InvoiceListView.vue:51` et `features/transactions/views/TransactionListView.vue:41` initialisent leurs filtres à vide sans lire `route.query` ;
  - `MissingReceiptsView.vue:38` et `ReconciliationListView.vue:46` ne lisent que le store de périmètre.
- **Preuve** : sonde Playwright puis tests `qa-cross-screen.spec.ts` (QA-01).
  - « 2 factures à valider » mène à une liste de 10 lignes sur 13 factures, avec le filtre Statut sur « Tous les statuts ». Même chose pour le manager France : compteur 0, liste de 7 lignes.
  - Le KPI « 12 transaction(s) de débit » sur l'année mène à « 15 transactions » (crédits inclus, période ignorée).
  - `/app/justificatifs-manquants?entityId=ent-fr` ouvert dans un nouvel onglet affiche 6 lignes au lieu de 3.
- **Impact** : c'est le premier clic d'une démonstration, et il contredit la règle écrite dans `actionCounters.ts` (« le nombre affiché EST la longueur de la liste »). Le test existant `dashboard.spec.ts:130` ne peut pas échouer : il compare le service à lui-même et ne regarde jamais la vue.
- **Correction** : chaque liste initialise ses filtres depuis `route.query` (statut, sens, dates, entité, recherche) et les réécrit dans l'URL quand ils changent, comme le font déjà Budgets, Abonnements et Analyses IA.
- **Tests** : `qa-cross-screen.spec.ts` › « factures à valider… » (3 rôles), « KPI Dépenses totales… », « lien partagé / nouvel onglet… ».

#### QA-03 — Pour un utilisateur limité, le consolidé « Toutes mes entités » inclut les parts d'entités inaccessibles
- **Gravité** : majeur · **Propriétaire** : Dashboards et Architecture (arbitrage D7)
- **Où** : `services/dashboard/mockDashboardService.ts:46-48`. Les transactions visibles (payées OU imputées, D7) sont passées en entier à `computeSpendReport` avec `entityId = null`.
- **Preuve** : `src/qa/invariants.spec.ts` › QA-03 (david, chloe, farid).
  - David (manager France) voit `imputedByEntity` contenir `ent-be`. Son total consolidé inclut les 1 800 € belges de l'exemple §5 et 909,30 € de `tx-be-103`.
  - Son total consolidé ≠ son dashboard « Lumen France SAS », alors que le sélecteur n'affiche qu'une seule entité portant le même nom.
- **Impact** : isolation d'affichage incohérente, et deux chiffres différents pour le même périmètre. À l'oral, la question « pourquoi le manager France voit-il 1 800 € imputés à la Belgique ? » n'a pas de bonne réponse.
- **Correction** : pour un utilisateur non admin/finance, le consolidé ne garde que les lignes imputées à ses entités : `computeImputedLines(...).filter(l => accessible.has(l.entityId))`. Les parts hors périmètre restent invisibles, ou s'affichent comme une seule ligne « autres entités (hors de votre accès) » sans détail.
- **Test** : `invariants.spec.ts` › QA-03.

#### QA-05 — Le dashboard entité lit « imputé à », mais les listes vers lesquelles il renvoie filtrent sur « payé par »
- **Gravité** : majeur · **Propriétaire** : Finances, en coordination avec Dashboards
- **Où** : `mockTransactionService.ts:62` (`t.entityId === entityId`) et `mockReconciliationService.ts:63-67`.
- **Preuve** : `invariants.spec.ts` › QA-05.
  - `tx-be-103` (1 299 €, dont 30 % imputés au projet France, sans justificatif) compte dans les dépenses imputées de Lumen France.
  - Elle est absente des « justificatifs manquants » de Lumen France pour un admin.
  - Elle est présente pour David, qui voit les pièces imputées (D7). La même liste diffère donc selon le rôle pour le même périmètre.
- **Impact** : contredit D2 (« deux lectures toujours libellées ») et l'exigence « données cohérentes entre tous les écrans ».
- **Correction** : choisir une règle et la libeller. Options :
  - le filtre `entityId` des listes signifie « payé par OU imputé à » (comme la visibilité D7), avec une colonne « payé par / imputé à » ;
  - ou un paramètre explicite `entityRole=paid|imputed`.
- **Test** : `invariants.spec.ts` › QA-05.

#### QA-11 — Confirmer un rapprochement laisse la facture « à payer » (échéances en retard, montant modifiable)
- **Gravité** : majeur · **Propriétaire** : Finances
- **Où** : `mockReconciliationService.ts:43-53` (`decide` ne touche pas la facture).
- **Preuve** : `invariants.spec.ts` › QA-11.
  - On confirme `rec-009`. `inv-005` (DELTA-2026-311) reste `approved`.
  - `toPayCents` est inchangé (4 316,59 €).
  - La facture reste dans les échéances (« en retard de 1 j » sur le tableau de bord).
  - Elle reste éditable dans `InvoiceDetailView` (`editable` couvre `approved`).
- **Impact** : l'action centrale du parcours §4 n'a pas d'effet visible sur les factures. Toutes les factures rapprochées du jeu initial sont pourtant `paid`.
- **Correction** : à la confirmation (et au rapprochement manuel), passer la facture en `paid`. À l'annulation éventuelle, revenir à `approved`. À valider avec D1 et D8.
- **Test** : `invariants.spec.ts` › QA-11.

#### QA-16 — URL directe vers le dashboard d'une entité non accessible : redirection silencieuse, dépendante du timing
- **Gravité** : majeur (fiabilité de la suite e2e) · **Propriétaire** : UI (`AppLayout`) et Dashboards
- **Où** : `layouts/AppLayout.vue:37-74`. Au chargement, le watcher de route sélectionne `ent-fr`. Le watcher « utilisateur / entités » le juge inaccessible et remet le périmètre à `null`. Le watcher de périmètre redirige alors vers `/app`.
- **Preuve** :
  - sonde : 12 sur 12 chargements de `/app/entites/ent-fr` par Chloé finissent sur `/app` sans « Accès refusé » ;
  - en navigation interne, la page affiche bien l'accès refusé ;
  - le test existant `dashboards-org-entity.spec.ts` › « un manager ne voit que son entité » échoue 3 fois sur 3 lancé seul et 9 fois sur 10 avec `--repeat-each 10`. Il ne passe que dans la suite complète, par effet de timing.
- **Impact** : comportement incohérent, et une suite verte qui n'est pas reproductible. Le chiffre « 38 tests verts » dépend de l'ordre d'exécution.
- **Correction** : ne pas réinitialiser le périmètre quand la route courante porte une entité non accessible (laisser `EntityDashboardView` afficher l'accès refusé), ou rediriger explicitement vers `/acces-refuse`.
- **Test** : `qa-cross-screen.spec.ts` › QA-16.

#### QA-18 — « La saisie manuelle reste possible » : promesse affichée, fonctionnalité absente
- **Gravité** : majeur (honnêteté, §11) · **Propriétaire** : Finances (fonction), UI (textes)
- **Où** :
  - promesse : `LandingView.vue:76`, `LandingPlans.vue:72`, `SettingsView.vue:182`, `AiUsageView.vue:209`, message par défaut `AI_UNAVAILABLE` dans `core/errors/ApiError.ts:96` (« Vous pouvez saisir les données manuellement ») ;
  - parcours prévu : `PARCOURS_UX.md:73,149` (« Saisir manuellement »).
- **Preuve** : `InvoiceService` n'a ni `createInvoice` ni création de brouillon vide. Après `AI_UNAVAILABLE` ou `AI_QUOTA_EXCEEDED`, `InvoiceImportView` revient à l'étape 1 sans autre chemin (`InvoiceImportView.vue:113-116`). Seul le rapprochement manuel existe.
- **Impact** : le jury déclenche l'erreur n°2 et cherche la saisie manuelle annoncée. Cela contredit aussi « l'IA assiste mais ne remplace pas ».
- **Correction** : ajouter `InvoiceService.createInvoice(input)` (mock et http, avec le contrat) et un bouton « Saisir manuellement » qui ouvre `InvoiceFormFields` vide. À défaut, retirer la promesse de tous les textes.
- **Test** : à écrire avec la fonctionnalité. La vérification actuelle est la recherche de `createInvoice` dans `services/invoices/InvoiceService.ts`.

#### QA-20 — Un collaborateur (member) voit les dépenses nominatives de ses collègues, y compris hors de son entité
- **Gravité** : majeur (arbitrage RGPD : minimisation) · **Propriétaire** : Architecture (décision H5 / D7)
- **Où** :
  - `domain/permissions.ts` : `member` a `dashboard:read` et `transactions:read` ;
  - `isTransactionVisible` ne filtre pas par carte.
- **Preuve** : sonde Vitest.
  - Farid (member France) obtient « Par collaborateur » : Alice 3 068 € (dont la carte belge de l'exemple), Chloé 1 299 €.
  - Emma voit les transactions des cartes de Chloé, Farid et Alice, alors que H5 dit « un member ne voit que ses propres cartes ».
- **Impact** : difficile à défendre face à l'exigence RGPD du §7. H5 est aussi incohérente : les cartes d'autrui sont cachées, mais leurs transactions sont visibles.
- **Correction (à arbitrer)** : `member` voit ses transactions de carte et un dashboard personnel. À défaut, retirer « par collaborateur / par carte » de sa vue.
- **Test** : à écrire après l'arbitrage. L'invariant QA-03 couvre déjà la partie « entité inaccessible » pour Farid.

### Mineurs

| Id | Constat | Propriétaire | Où | Preuve / test | Correction |
|----|---------|--------------|----|---------------|------------|
| QA-02 | Le lien d'une analyse IA vers une transaction (`?search=<id>`) n'a aucun effet. La liste ignore `search` dans l'URL, et la recherche du service ne porte pas sur l'identifiant. | Finances, Dashboards | `AiInsightListView.vue:343` ; `mockTransactionService.ts:89` | Le lien mène à 10 lignes au lieu de 1. `qa-cross-screen` › QA-02 | Lien direct vers `TransactionDetail`, ou lecture de `search` et recherche sur l'id. |
| QA-04 | `DashboardSummary.missingReceiptCount`, `pendingReconciliationCount` et `invoicesToReviewCount` sont calculés sur l'entité **payeuse**. Ils divergent des listes (3 contre 4 pour David) et aucun écran ne les utilise, mais `CONTRATS_API.md:190` les présente au backend A comme contrat. | Dashboards | `mockDashboardService.ts:53-61,80-83` | `invariants.spec.ts` › QA-04 | Supprimer ces champs du contrat, ou les aligner sur les listes. |
| QA-06 | Une même cible (entité + centre de coûts) peut apparaître deux fois dans une ventilation. | Finances, Architecture | `domain/finance/allocations.ts:7-18` | `invariants.spec.ts` › QA-06 | Refuser les doublons dans `validateAllocationInputs`. |
| QA-07 | Réimporter le même CSV crée des doublons sans avertissement (I3.10). | Finances | `mockTransactionService.ts:131-176` | `invariants.spec.ts` › QA-07 | Détecter les doublons (date, montant, libellé, compte) et les signaler dans l'aperçu. |
| QA-08 | Deux factures identiques (même fournisseur, même numéro) sont acceptées. L'extraction simulée renvoie toujours BC-56010, donc un second import de démonstration crée un doublon. | Finances | `mockInvoiceService.ts:186-227` | `invariants.spec.ts` › QA-08 | Conflit ou avertissement « doublon potentiel » à `confirmDraft`. |
| QA-09 | La suppression de son compte laisse des références orphelines (`cards.holderUserId`, `reconciliations.decidedByUserId`, `importBatches.importedByUserId`). | Architecture | `mockPrivacyService.ts:48-52` | `invariants.spec.ts` › QA-09 | Pseudonymiser l'utilisateur (« Utilisateur supprimé ») au lieu de le retirer. |
| QA-10 | `users.get` ne contrôle ni la permission ni l'entité : un member France lit la fiche de Chloé (Belgique). | Architecture | `mockUserService.ts:27-34` | `invariants.spec.ts` › QA-10 | `requirePermission('users:read')` et une entité commune. |
| QA-12 | En mode « une seule fois » activé par l'URL sans portée, l'erreur est consommée par le premier appel de la coque (liste des entités). L'écran visé ne voit jamais l'erreur. Le commit `bc7166b` contourne le problème dans le test au lieu de le corriger. | Architecture | `core/errors/errorSimulator.ts:64-69` ; `AppLayout.vue:33` | `qa-cross-screen` › QA-12. Le panneau démo, lui, fonctionne (test vert). | Exclure `organization.*` et `auth.*` de la portée `*`, ou appliquer `once` à la première opération déclenchée après la navigation. |
| QA-13 | Les pages 403 et 404 d'un utilisateur connecté s'affichent dans la coque publique : plus de navigation ni de périmètre, et un bouton « Ouvrir l'application » au lieu de son menu. | UI | `router/routes.ts:29` ; `features/errors/routes.ts:14` | `qa-cross-screen` › QA-13 (2 tests). Capture `403-member.png`. | Déclarer aussi les routes d'erreur sous `/app` quand une session existe. |
| QA-14 | Le service accepte de modifier les lignes d'une facture **payée et rapprochée** (`inv-001` passe à 1 210 €, toujours rapprochée de 3 000 €). Seule l'interface bloque. | Finances | `mockInvoiceService.ts:126-135` | `invariants.spec.ts` › QA-14 | Refuser `updateInvoice` sur `paid` et `cancelled` (I3.3). |
| QA-15 | Le scénario « 401 — session expirée » (portée `*`, mode `always`) bloque aussi la reconnexion : le formulaire répond « Session expirée ». L'orateur doit penser au lien « Désactiver ». | Architecture | `errorScenarios.ts:53` ; `main.ts:17` | `qa-cross-screen` › QA-15. Capture `session-relogin.png`. | Mode `once` par défaut pour 401, ou exclure `auth.*` de la portée. |
| QA-17 | Les noms d'entités diffèrent selon l'écran : « Belgique / France » côté Finances, déduits du **code pays**, et « Lumen Belgium SRL » côté dashboards et sélecteur. Avec deux entités dans le même pays, les deux s'afficheraient « Belgique ». | Finances | `features/transactions/shared/useReferenceData.ts:62-66` | Captures 1280 des dashboards et du détail de transaction | Utiliser `entity.name` partout, ou un champ `shortName` dans le modèle. |
| QA-19 | Aucune action « Rejeter / contester » une facture extraite. `to_review` ne peut que passer à `approved`, alors que `PARCOURS_UX.md:160` prévoit « Rejeter… ». Le statut `disputed` n'existe que dans le jeu initial. | Finances | `InvoiceService.ts` ; `InvoiceDetailView.vue:108-114` | Lecture de l'interface du service | `rejectInvoice(id, motif)` qui passe à `disputed`, ou retirer l'action de PARCOURS_UX. |
| QA-21 | Le réglage « Afficher la légende de provenance » (`showAiLegend`) n'a aucun effet : aucun écran ne le lit, et la légende n'existe pas dans les écrans de correction. | UI, Finances | `SettingsView.vue:118` ; `composables/usePreferences.ts:13` | Recherche de `showAiLegend` : lu uniquement par Settings | Afficher la légende dans `InvoiceImportView` et `InvoiceDetailView` sous condition, ou retirer le réglage. |
| QA-22 | Duplications nées du développement en parallèle (détail ci-dessous). | Architecture | voir détail | Recherches manuelles (`knip` et `jscpd` n'ont pas pu être lancés, cf. §4) | Unifier ; déplacer `transactions/shared` vers `src/components` ou `src/composables`. |
| QA-24 | « Justificatifs manquants » › « Associer une facture » mène à la page des rapprochements sans transaction présélectionnée, et sans chemin « importer le justificatif de cette dépense ». | Finances | `MissingReceiptsView.vue:136-139` | Lecture | Passer la transaction en query, puis ouvrir le dialogue manuel ou l'import PDF. |
| QA-25 | Le jeu initial contient une suggestion (`rec-009`) avec 8 € d'écart, alors que D6 et `suggestMatches` n'en produisent qu'à montant identique. La confirmer crée un rapprochement confirmé à écart non nul, sans demander de justification. | Architecture (données), Finances | `mocks/dataset/banking.ts:140` | Capture des rapprochements à 360 px | Aligner D6 (tolérance documentée) et le jeu de données, et exiger une confirmation explicite de l'écart. |
| QA-28 | Tests faibles ou impossibles à faire échouer (détail ci-dessous). | Tous | voir détail | Lecture et exécutions répétées | Remplacés ou complétés par les tests QA ; à corriger dans les fichiers d'origine. |

Détail de QA-22 :
- deux chargeurs de référentiels avec des politiques d'erreur opposées : `useReferenceData`, qui expose l'erreur, et `useReferenceLabels`, qui l'avale ;
- trois enveloppes asynchrones : `ErrorMessage`, `AsyncContent`, `AsyncBlock`, en plus d'`ErrorState` ;
- double correspondance des provenances (`PROVENANCE_TO_UI` et `toUiProvenance`) ;
- `PROVENANCE_LABELS` du domaine n'est pas utilisé, et ses libellés diffèrent du catalogue (« Corrigé par un utilisateur » contre « Corrigé ») ;
- une carte bloquée s'appelle « Désactivée » (`labels.ts:39`) ou « Bloquée » (`catalog.ts:104`) selon l'écran ;
- `features/transactions/shared` sert de module partagé à 10 autres features ;
- `components/PlaceholderPage.vue` est du code mort.

Détail de QA-28 :
- `dashboard.spec.ts:130` est une tautologie (cf. QA-01) ;
- l'e2e « un compteur mène à la liste » ne vérifie que les analyses IA ;
- `finance-demo-errors.spec.ts` ne vérifie jamais l'intégrité des données. Il navigue par `page.goto`, qui recharge et réinitialise le jeu : une corruption y serait invisible ;
- test instable QA-16 ;
- `MATRICE_EXIGENCES.md` est resté à l'état des fondations (« reste à faire » des écrans déjà livrés).

### Cosmétiques

| Id | Constat | Propriétaire | Où | Correction |
|----|---------|--------------|----|------------|
| QA-23 | Les champs date natifs suivent la langue du navigateur : `mm/dd/yyyy` dans un Chromium anglais. Sur le même écran, l'en-tête affiche « émise le 15/09/2026 » et le champ « 09/15/2026 » (capture `date-enUS.png`). | UI | `BaseTextField` (`type="date"`) ; `InvoiceFormFields.vue:142,160` ; `PeriodFilter.vue:63` | Accepter, ou afficher le format attendu en aide (« jj/mm/aaaa ») et la date formatée à côté. |
| QA-26 | L'aperçu de la landing (48 230 €, +12,4 %, 4 factures à valider, doublon Figma) ne correspond pas au jeu de démonstration (8 456,78 € sur l'année, 2 à valider, pas de Figma). Il est annoncé comme illustratif. | UI | `features/landing/components/LandingHero.vue` | Reprendre les chiffres de l'exemple §5 ou du jeu de démonstration. |
| QA-27 | À 360 px, l'onglet « Rejetées » des rapprochements est tronqué (« Rej… »), et le bouton « Afficher » des factures à valider est isolé sur sa ligne. | UI | `BaseTabs` ; `InvoiceListView.vue` (`.counter`) | Rendre les onglets défilables avec un indicateur ; regrouper le compteur. |
| QA-29 | La règle ESLint d'architecture ne couvre pas `src/composables`, `src/router` ni `App.vue`. Aucune violation n'existe aujourd'hui. | Architecture | `eslint.config.js` (`app/architecture-rules`) | Ajouter ces chemins. |

## 3. Vérifié et conforme (réellement exécuté)

### 3.1 Invariants financiers — `src/qa/invariants.spec.ts` (54 tests, dont 12 échecs attendus)

Sur le jeu de données brut :
- Σ lignes = totaux de la facture ; HT + TVA = TTC par ligne et par facture ; quantité × prix = HT ;
- échéance ≥ émission ; EUR partout ;
- allocations : 100 % exactement, au centime, montants positifs ;
- rapprochements confirmés en 1 ↔ 1, à écart nul ;
- carte : une seule entité, titulaire membre de cette entité ;
- déterminisme : deux chargements donnent des objets profondément égaux ;
- intégrité référentielle complète, y compris budgets, consommation IA et cartes.

Exemple §5, via les services : 1 facture, 1 transaction (carte d'Alice, Belgique), 1 rapprochement confirmé, 2 allocations (60 % / 1 800 € et 40 % / 1 200 € sur `cc-fr-paris`). Le retirer fait baisser le total de 3 000 € exactement. Payé par : Belgique +3 000 €, France +0. Aucune pièce côté France.

Pour **les 6 comptes de démonstration** et **chaque périmètre accessible** :
- chaque ventilation (entité, centre de coûts, catégorie, collaborateur, carte, mois) somme exactement à son total ;
- Σ payé par entité = total payé ;
- montants entiers ;
- budgets d'entité consommés = imputé du mois sur le dashboard entité.

Pour l'admin :
- Σ imputé des entités = Σ payé des entités = total organisation = Σ des débits de la liste Transactions ;
- la barre de chaque entité sur le dashboard organisation = le total du dashboard de cette entité.

Après mutations :
- 60/40 → 50/50 : total inchangé, Belgique −300 €, France +300 €, aucune pièce créée ;
- 100 € en trois tiers : 33,34 + 33,33 + 33,33, et dix sauvegardes successives ne font pas dériver les montants ;
- répartitions invalides (90 %, 110 %, part nulle, part négative, décimale) refusées, ancienne répartition conservée ;
- confirmer ou rejeter une suggestion ne change aucun total ; justificatifs manquants −1 au confirmé ; une paire rejetée n'est pas re-suggérée ;
- import CSV : total + Σ débits, justificatifs + nombre de débits ;
- création de budget : consommé = imputé du centre de coûts, et Σ du détail = consommé ;
- une extraction IA réussie ajoute sa consommation de tokens mais aucune dépense ; Σ par fonctionnalité = total ;
- suppression des données de l'organisation puis réinitialisation : retour exact à l'état initial.

Les 4 erreurs simulées en mode `always` sur import PDF, import CSV, suggestions, ventilation et confirmation : aucune donnée corrompue et consommation IA inchangée (D11). Un appel IA échoué ne consomme rien.

Isolation : un manager Belgique ne lit pas de pièce purement française par identifiant, et l'entité France lui renvoie 403. Un member reçoit 403 sur factures, rapprochements et budgets.

### 3.2 Parcours e2e — `qa-cross-screen.spec.ts`

- **Parcours complet sans rechargement** : import PDF → correction → validation → la facture n'ajoute rien au total → confirmation de `rec-007` (total inchangé, justificatifs −1) → exemple §5 en 50/50 (Belgique −300 €, France +300 €, total inchangé) → import CSV (+36,40 €, justificatifs +2).
- **Interception réseau sur tout ce parcours** : aucune requête hors de l'origine de l'application et aucun appel `fetch`/`xhr` (hors fichiers de démonstration servis en local).
- **Quatre erreurs simulées via le panneau démo, sans rechargement** : fichier invalide (CSV), IA indisponible et quota dépassé (PDF, puis « Réessayer » qui aboutit), réseau (ventilation refusée). Ensuite : total et justificatifs identiques, répartition §5 intacte, aucune facture fantôme.
- Panneau démo en mode « une seule fois » : l'erreur touche l'action suivante, puis l'action réussit.
- Compteurs « justificatifs manquants » et « rapprochements en attente » = lignes ou cartes de la liste, pour admin, manager Belgique et manager France.
- Accès refusés par URL directe : 8 routes pour un member, 3 pour un manager.
- Pièces étrangères au périmètre « introuvables », sans fuite du numéro.
- Session expirée → connexion avec `redirect` → retour sur la page après reconnexion (une fois la simulation désactivée).
- Synchronisation du périmètre : sélecteur → dashboard entité → liste (pas de saut vers un dashboard) → « Tableau de bord » mène au dashboard du périmètre → retour au consolidé → bouton Précédent cohérent ; aucun avertissement Vue Router.

### 3.3 Responsive et accessibilité — `qa-responsive-a11y.spec.ts`

- **Débordement horizontal mesuré** (`scrollWidth ≤ innerWidth`) à 360, 768 et 1280 px sur les 5 routes publiques et les **25 routes de l'application**, dont les détails, les imports et la 404 : aucun débordement.
- Un seul `h1` et un seul `main` par route, titre de document « … — CashLens » distinct par route.
- **axe-core** (WCAG 2.0 / 2.1 A et AA) : aucune violation « serious » ni « critical » sur les 30 routes à 1280 px.
- Clavier :
  - connexion au clavier ;
  - lien d'évitement en premier, qui mène à `#contenu` ;
  - anneau de focus visible ;
  - dialogue : focus placé dedans, Échap le ferme et rend le focus au déclencheur ;
  - ventilation 50/50 saisie et enregistrée au clavier.
- **Captures examinées** (90 pleines pages, 3 largeurs). Pas de casse de mise en page. Défauts relevés : QA-13, QA-17, QA-23, QA-26, QA-27.

### 3.4 Grille d'audit statique

| Point | Résultat | Preuve |
|-------|----------|--------|
| Vues, stores et composants n'importent pas le jeu de données ni les implémentations | Conforme | `grep "@/mocks\|services/.*/mock"` hors `services/` : seul `spend.spec.ts` (un test). Règle ESLint active (cf. QA-29). |
| Bascule mock/http en un point | Conforme | `import.meta.env` lu uniquement dans `config/env.ts`, le routeur et le chemin des fichiers de démo. `createServices` dans `services/index.ts`. Mode démo désactivé en http (`stores/demoMode.ts:25`). |
| Pas de backend concurrent | Conforme | Ni MSW, ni json-server, ni express dans `package.json`. 3 dépendances d'exécution (vue, vue-router, pinia). |
| Aucun secret | Conforme | Recherches `api_key`, `secret`, `sk-`, `Bearer` : rien. `.env*` ignorés sauf `.env.example` et `.env.e2e`, sans valeur sensible. |
| Aucun appel IA ni fournisseur réel | Conforme | Recherches `openrouter`, `openai`, `chat/completions` : uniquement un commentaire. Interception réseau e2e (§3.2). Aucun identifiant de modèle. |
| Aucune police, CDN ou outil d'analyse externe | Conforme | Aucune URL externe dans `index.html` ni dans les styles. |
| Pas de fausse sécurité présentée comme réelle | Conforme, sauf QA-18 (promesse fonctionnelle) | Connexion, rôles, isolation et relances annoncés comme simulés à l'écran (bandeau, connexion, 403). Recherches `chiffr`, `sécuris`, `jwt`, `certifi` : rien. |
| Pas de `v-html`, `console.log`, `debugger`, `@ts-ignore`, `any`, `Math.random`, `new Date()` dans la logique | Conforme | Recherches correspondantes. |
| Stockage navigateur | Conforme | `sessionStorage` : jeton factice. `localStorage` : préférences d'affichage. |
| Hors périmètre §10 non implémenté | Conforme | Ni OCR, ni prévisions, ni achats, ni workflow, ni export avancé, ni intégration bancaire, ni comptabilité générale, ni intersociétés. L'export JSON RGPD est attendu. |
| Pas de correspondance O1–O7 inventée | Conforme | Recherche `O[1-7] [:=—]` dans `docs/` et `src/` : rien. La matrice est regroupée par blocs. |
| Données fictives | Conforme | Cartes en 4 derniers chiffres, IBAN masqués, adresses `.test`. |
| Taille | À surveiller | 246 fichiers hors tests, environ 26 000 lignes (templates et CSS compris) ; `LandingView.vue` fait 844 lignes, `DashboardContent.vue` 584. Le code reste lisible, mais la duplication QA-22 alourdit les explications à l'oral. |

## 4. Non vérifié

- **Mode http contre un vrai backend** : les adaptateurs ne sont que compilés.
- **Navigateurs autres que Chromium** (Firefox, Safari), appareils mobiles réels, lecteurs d'écran (NVDA, VoiceOver) : seuls axe-core et les contrôles de rôles ont été faits.
- **axe-core aux largeurs 360 et 768** : exécuté à 1280 seulement. Pas de vérification non plus des contrastes sur les états survol et désactivé.
- **`knip` et `jscpd`** : l'exécution de paquets téléchargés à la volée a été refusée dans cet environnement. Le code mort et la duplication ont été cherchés à la main (recherches de références) et peuvent être incomplets.
- **Captures en Chromium francophone** : les captures sont en `en-US`. QA-23 repose sur cette différence.
- **Inscription** (au-delà de la session simulée couverte par les tests existants), **export RGPD** (contenu du fichier) et **pages de détail carte et collaborateur** : rendu et responsive vérifiés, logique non approfondie.
- **Annulation d'un rapprochement confirmé** (bouton « Annuler » 5 s prévu par PARCOURS_UX) : non recherchée.

## 5. Avis sur les décisions D1–D13 / H1–H12

- **D1, D2, D4, D5, D10, D11, D12** : défendables et correctement appliqués dans les services (prouvé par §3.1). D2 n'est pas respecté par les listes (QA-05).
- **D6** : le jeu de données le contredit (QA-25). Il faut choisir entre « montant identique seulement » et une tolérance documentée.
- **D7** (« voit les pièces payées OU imputées ») : défendable pour la **liste des pièces**, mais il conduit à QA-03 dès qu'on agrège. Précisez : « voit la pièce, mais seulement les parts imputées à ses entités ».
- **H5** (member) : à revoir (QA-20). En l'état, la décision est difficile à défendre au regard du RGPD.
- **D13** (rechargement = réinitialisation) : acceptable, mais à annoncer au jury, car un F5 annule la démonstration. Cela rend aussi aveugles à la corruption les tests e2e qui utilisent `page.goto` (QA-28).
- **H3** (catégorie par transaction) : cohérent avec D1, mais la catégorie de la facture n'est jamais reprise sur la transaction lors du rapprochement. À noter pour la partie A.
