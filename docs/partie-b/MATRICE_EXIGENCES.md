# Matrice PROVISOIRE des exigences connues (partie B)

> La correspondance individuelle entre les numéros O1 à O7 et les exigences **n'est pas connue**
> (cahier des charges §7) : le document de synthèse ne donne que deux groupes, « O1 à O3 » et « O4 à O7 ».
> Cette matrice liste donc les exigences effectivement connues, par groupe, sans leur attribuer de numéro individuel.
> Elle sera complétée dès que la correspondance exacte sera fournie.

État au 25 novembre 2026, après intégration, contre-audit indépendant et corrections.
Tout est démontré **en mode mock** (aucun backend) : la colonne « Dépendance restante » dit ce qui relève de A (backend FastAPI) ou de C (infrastructure).

Légende de l'état : **Démontré** = utilisable dans l'application et couvert par un test automatique ; **Simulé** = le comportement est visible mais repose sur une simulation annoncée comme telle.

Les tests cités sont dans `frontend/src/**/*.spec.ts` (Vitest) et `frontend/e2e/*.spec.ts` (Playwright). Le détail des preuves est dans [AUDIT_QA.md](AUDIT_QA.md).

## Groupe « O1 à O3 »

| Exigence | Resp. | Fonctionnalité correspondante (partie B) | État | Preuve d'implémentation | Test associé | Dépendance restante |
|---|---|---|---|---|---|---|
| IA centrale avec données enregistrées | A + B | Import PDF → brouillon avec provenance par champ → correction → validation → facture enregistrée ; suggestions de rapprochement puis décision humaine ; analyses IA ; consommation enregistrée après chaque appel réussi | Simulé (le modèle d'IA) ; démontré (le parcours et l'enregistrement en mémoire) | `features/invoices`, `features/reconciliations`, `features/ai-insights`, `services/*/mock*Service.ts` | `e2e/finance-imports`, `e2e/qa-cross-screen` (parcours complet), `src/qa/invariants` (I7) | A : appel réel au fournisseur d'IA, persistance en base. C : clé du fournisseur côté serveur uniquement |
| Au moins quatre entités métier reliées | A + B | Organisation → entité → utilisateur → carte → transaction → rapprochement → facture (lignes) → allocation ; catégories, centres de coûts, budgets, abonnements, échéances | Démontré | `src/domain/`, `src/mocks/dataset/` | `src/qa/invariants` (I9.2, intégrité référentielle), `dataset.spec` | A : schéma PostgreSQL |
| Authentification | A (réelle) + B (écrans) | Connexion, inscription, déconnexion, session expirée, redirection vers la page demandée | Simulé (jeton factice, annoncé à l'écran) | `features/auth`, `stores/auth.ts`, `router/guards.ts` | `e2e/smoke`, `e2e/public-and-shell`, `e2e/qa-cross-screen` (AUTH) | A : authentification réelle, jetons, mots de passe |
| Gestion des rôles | A (réelle) + B (affichage) | Quatre rôles (admin, finance, manager, collaborateur) ; navigation filtrée, actions masquées, page « Accès refusé », refus aussi dans les services | Simulé (matrice côté navigateur) | `domain/permissions.ts`, `layouts/navigation.ts`, `features/errors` | `guards.spec`, `navigation.spec`, `e2e/qa-cross-screen` (rôles, URL directe), `src/qa/regressions` | A : autorisation côté serveur. Groupe : valider la matrice des droits |
| Isolation des données | A | Filtrage par organisation et par entités accessibles ; un collaborateur ne voit que ses propres dépenses ; totaux limités aux parts imputées aux entités accessibles | Simulé (contournable dans le navigateur, documenté comme tel) | `services/mock/access.ts`, `DECISIONS.md` (D7 révisé) | `src/qa/invariants`, `src/qa/regressions` (6 comptes, tous périmètres) | **A : seule isolation réelle** |
| Interface responsive | B | Coque avec barre latérale et tiroir mobile ; tableaux repliés en fiches ; graphiques SVG adaptatifs | Démontré | `layouts/`, `components/ui/`, `styles/` | `e2e/qa-responsive-a11y` (30 routes × 360, 768, 1280 px, débordement mesuré ; axe-core) | — |

## Groupe « O4 à O7 »

| Exigence | Resp. | Fonctionnalité correspondante (partie B) | État | Preuve d'implémentation | Test associé | Dépendance restante |
|---|---|---|---|---|---|---|
| Suivi des coûts et tokens IA | A + B | Page « Consommation IA » : tokens entrée/sortie, coût estimé, par fonctionnalité, par jour et par mois, journal | Simulé (données fictives, prix par token indicatif) | `features/ai-usage`, `domain/finance` (`summarizeAiUsage`) | `e2e/dashboards-*`, `src/qa/invariants` (I7.1) | A : comptage réel des tokens renvoyés par le fournisseur |
| Gestion des quotas IA | A + B | Quota de l'offre lu dans `config/plans.ts`, barre de progression, alerte à 80 %, blocage au dépassement, saisie manuelle proposée | Démontré en mock (blocage réel dans le service mock) | `features/ai-usage`, `services/mock/aiQuota.ts` | `aiUsage` (Vitest), `e2e/finance-demo-errors`, `e2e/public-and-shell` | A : application du quota côté serveur. Groupe : valider les quotas |
| Quatre erreurs simulables | B (+ A pour les vraies) | Fichier invalide, service IA indisponible, quota IA dépassé, API indisponible ; déclenchement par le panneau « Mode démonstration » ou par `?demoError=` ; message, réessai, aucune donnée corrompue | Démontré (le contrôle du fichier est réel ; les trois autres sont simulées) | `core/errors/`, `components/DemoModePanel.vue` | `errorSimulator.spec`, `e2e/finance-demo-errors`, `e2e/public-and-shell`, `e2e/qa-cross-screen` (ERR-01 à 04) | Groupe : confirmer que ces quatre scénarios conviennent (proposition technique, non imposée). A : mêmes codes d'erreur |
| Landing page avec deux paliers | B | Landing complète, offres « Essentiel » et « Pro » lues depuis la configuration, mention « tarif indicatif, non contractuel » | Démontré | `features/landing`, `config/plans.ts` | `e2e/smoke`, `e2e/public-and-shell` | Groupe : valider noms, prix et quotas |
| Respect du RGPD | A + B + C | Page publique de confidentialité, minimisation (4 derniers chiffres des cartes, pas de données nominatives des collègues), export des données | Simulé (export et traitements en mémoire) | `features/privacy` | `e2e/public-and-shell`, `src/qa/regressions` | A : traitements réels, journalisation. C : hébergement, sauvegardes, durées de conservation à fixer |
| Transparence concernant l'IA | B (+ A pour la provenance réelle) | Cinq provenances distinguées par le texte, l'icône et la forme ; légende ; mentions « simulé » ; page publique « transparence IA » ; validation humaine obligatoire | Démontré | `domain/provenance.ts`, `components/ui/AiProvenanceBadge.vue`, `AiProvenanceLegend.vue` | `AiProvenanceBadge.spec`, `e2e/finance-imports`, axe-core | A : provenance réelle renvoyée par champ |
| Suppression des données | A + B | Suppression de compte par pseudonymisation, suppression des données de l'organisation, réinitialisation de la démonstration | Simulé (en mémoire, restauré au rechargement, annoncé à l'écran) | `features/privacy`, `services/privacy` | `src/qa/regressions` (D19), `e2e/public-and-shell` | A : effacement persistant. Groupe : obligations légales de conservation |

## Exigence métier transversale

| Exigence | Resp. | Fonctionnalité correspondante | État | Preuve d'implémentation | Test associé | Dépendance restante |
|---|---|---|---|---|---|---|
| Exemple obligatoire : facture de 3 000 €, payée par Alice (carte belge), imputée à 60 % à la Belgique et 40 % au Projet France, sans double comptabilisation | B (+ A) | Une facture, une transaction, un rapprochement, deux imputations ; éditeur de répartition ; dashboards « imputé à » / « payé par » | Démontré | `mocks/dataset` (`inv-001`, `tx-be-101`, `rec-001`), `domain/finance` (`computeSpendReport`), `features/allocations` | `money.spec`, `spend.spec`, `src/qa/invariants` (E1 à E8), `AllocationEditorView.spec`, `e2e/finance-reconciliation-allocation`, `e2e/dashboards-org-entity` | A : mêmes règles de calcul côté serveur (centimes entiers, plus grand reste) |

## Non vérifié à ce jour

- Mode HTTP contre un vrai backend (les adaptateurs sont des squelettes conformes à [CONTRATS_API.md](CONTRATS_API.md)).
- Firefox, Safari, appareils réels, lecteurs d'écran.
- Déploiement (staging, production) : partie C.
