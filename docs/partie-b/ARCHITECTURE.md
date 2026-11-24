# Partie B — Architecture du frontend CashLens

> Public : les étudiants et agents qui développent le frontend (partie B), et les responsables
> A (backend) et C (infrastructure) pour l'intégration. Décisions métier : [DECISIONS.md](DECISIONS.md).
> Contrats API provisoires : [CONTRATS_API.md](CONTRATS_API.md). Attentes envers A et C :
> [DEPENDANCES_A_C.md](DEPENDANCES_A_C.md).

## 1. Principes

1. **Les vues ne parlent qu'à des interfaces de services** (`useServices().invoices…`). Elles ne
   savent pas si les données viennent du mock en mémoire ou de l'API FastAPI. Une règle ESLint
   interdit d'importer `@/mocks/*` ou une implémentation `mock*` / `http*` depuis
   `features/`, `stores/`, `components/` ou `layouts/`.
2. **Un seul calcul des dépenses** : `computeImputedLines` / `computeSpendReport`
   (`src/domain/finance/spend.ts`). Dashboards, budgets et écrans financiers l'utilisent tous ;
   c'est ce qui garantit des chiffres identiques d'un écran à l'autre.
3. **Montants en centimes entiers**, pourcentages en points de base, un seul module monétaire
   (`src/core/money`).
4. **Une seule erreur applicative** (`ApiError`) et un seul mécanisme de simulation d'erreurs.
5. **Pas de faux backend** : le mock est une implémentation en mémoire des interfaces, avec un
   jeu de données fictif déterministe. Pas de MSW, pas de serveur local.
6. **Pas de fausse sécurité** : rôles, permissions, isolation et session sont SIMULÉS pour
   l'affichage ; la sécurité réelle relève du backend (A).

## 2. Arborescence

```
frontend/
├── public/demo/                 Fichiers d'exemple FICTIFS (CSV valide / invalide, PDF, faux PDF)
├── e2e/                         Tests Playwright (smoke)
├── src/
│   ├── main.ts, App.vue         Démarrage (Pinia, routeur, gestion globale du 401)
│   ├── config/                  env.ts (VITE_*), plans.ts (offres), demo.ts (horloge figée)
│   ├── core/                    Briques techniques sans métier
│   │   ├── money/               Centimes, arrondis, répartition au plus grand reste, formatage
│   │   ├── dates/               Dates ISO sans fuseau
│   │   ├── errors/              ApiError, scénarios simulables, simulateur, bus d'erreurs
│   │   ├── http/                Client fetch → ApiError, jeton de session
│   │   └── mock/                Runtime mock (latence, erreurs simulées, copie des résultats)
│   ├── domain/                  Modèles TypeScript partagés (un fichier par domaine)
│   │   └── finance/             Calculs purs : dépenses, allocations, budgets, échéances…
│   ├── mocks/dataset/           Jeu de données fictif unique (interdit hors services mock)
│   ├── services/                Une interface par domaine + implémentations mock et http
│   │   ├── <domaine>/XxxService.ts, mockXxxService.ts, httpXxxService.ts
│   │   ├── mock/                Contexte mock, contrôles d'accès simulés, quota IA
│   │   └── index.ts             REGISTRY : choix mock / http en un seul point
│   ├── stores/                  auth (session simulée), demoMode, entityScope
│   ├── router/                  routes.ts (assemblage), guards.ts, routeNames.ts, meta.ts
│   ├── layouts/                 PublicLayout, AppLayout, navigation.ts
│   ├── components/              Composants transverses minimaux (PlaceholderPage, ErrorMessage, DemoModePanel)
│   ├── composables/             useAsync (chargement + erreur uniformes)
│   ├── features/<domaine>/      routes.ts + views/ — UN dossier par écran métier
│   ├── styles/                  tokens.css (variables provisoires), base.css
│   └── test/helpers.ts          Outils de test (services neufs, connexion, fichiers de démo)
```

### Domaines (`features/`) et routes

| Dossier | Routes (nom → chemin) | Permission |
|---------|-----------------------|------------|
| `landing` | `landing` → `/` | publique |
| `auth` | `login` → `/connexion`, `signup` → `/inscription` | invité |
| `privacy` | `privacy-public` → `/confidentialite` ; `privacy-settings` → `/app/confidentialite` | publique ; `privacy:self` |
| `errors` | `forbidden` → `/acces-refuse`, `not-found` → `*` | publique |
| `dashboard` | `org-dashboard` → `/app`, `entity-dashboard` → `/app/entites/:entityId` | `dashboard:read` |
| `invoices` | `invoices` → `/app/factures`, `invoice-import` → `/app/factures/import`, `invoice-detail` → `/app/factures/:invoiceId` | `invoices:read` / `invoices:import` |
| `transactions` | `transactions`, `transaction-import` (`/app/transactions/import`), `missing-receipts` (`/app/justificatifs-manquants`) | `transactions:read` / `transactions:import` |
| `reconciliations` | `reconciliations` → `/app/rapprochements` | `reconciliations:read` |
| `allocations` | `allocations` → `/app/allocations` | `allocations:read` |
| `cards` | `cards` → `/app/cartes` | `cards:read` |
| `users` | `users` → `/app/collaborateurs` | `users:read` |
| `categories` | `categories` → `/app/categories` | `categories:read` |
| `cost-centers` | `cost-centers` → `/app/centres-de-couts` | `cost-centers:read` |
| `budgets` | `budgets` → `/app/budgets` | `budgets:read` |
| `subscriptions` | `subscriptions` → `/app/abonnements` (abonnements et échéances) | `subscriptions:read` |
| `ai-insights` | `ai-insights` → `/app/analyses-ia` | `ai-insights:read` |
| `ai-usage` | `ai-usage` → `/app/consommation-ia` | `ai-usage:read` |
| `settings` | `settings` → `/app/parametres` | session |

Toutes les vues sont chargées en lazy-loading. Les vues encore vides affichent `PlaceholderPage`
avec la description attendue et les services à utiliser. Le tableau de bord, la connexion,
l'inscription et la landing ont une version provisoire fonctionnelle.

**Travail en parallèle** : un agent qui remplit un écran ne modifie que `features/<domaine>/`
(et y ajoute ses composants, son store éventuel `features/<domaine>/store.ts`). Les fichiers
partagés (`router/routes.ts`, `routeNames.ts`, `services/index.ts`, `domain/*`, `mocks/dataset/*`)
ne doivent être modifiés que de façon coordonnée.

## 3. Modèle métier (src/domain)

| Fichier | Types principaux |
|---------|------------------|
| `common.ts` | `Id`, `Cents`, `BasisPoints`, `IsoDate`, `IsoDateTime`, `DateRange`, `Page<T>`, `PageQuery` |
| `organization.ts` | `Organization`, `LegalEntity`, `CountryCode` |
| `user.ts` | `User`, `Role` (`admin`, `finance`, `manager`, `member`), `ROLE_LABELS` |
| `permissions.ts` | `Permission`, `ROLE_PERMISSIONS`, `hasPermission`, `canAccessEntity` |
| `supplier.ts`, `category.ts` | `Supplier`, `Category` |
| `invoice.ts` | `Invoice`, `InvoiceLine`, `InvoiceStatus`, `InvoiceInput`, `InvoiceDraft`, `SourceDocument` |
| `bank.ts` | `BankAccount`, `BankTransaction`, `BankTransactionView`, `TransactionDirection`, `ImportBatch`, `CsvImportResult` |
| `card.ts` | `Card` (une entité, un porteur) |
| `reconciliation.ts` | `Reconciliation` (`suggested` → `confirmed` / `rejected`) |
| `analytics.ts` | `CostCenter` (`department` / `project`), `Allocation`, `AllocationInput` |
| `budget.ts` | `Budget` (mensuel), `BudgetStatus` |
| `subscription.ts` | `RecurringSubscription`, `DueItem` (échéance) |
| `ai.ts` | `AiInsight` (5 types), `AiUsageRecord`, `AiUsageSummary` |
| `plan.ts` | `Plan`, `PlanId` |
| `provenance.ts` | `DataProvenance`, `ExtractedField<T>` |
| `privacy.ts` | `DataExport`, `DeletionRequest` |
| `spend.ts` | `ImputedLine`, `SpendReport`, `SpendBreakdownItem` |
| `dashboard.ts` | `DashboardSummary` |
| `auth.ts` | `Session`, `LoginCredentials` |

Calculs purs (`src/domain/finance`) : `computeInvoiceLine`, `computeInvoiceTotals`,
`validateAllocationInputs`, `buildAllocations`, `allocationsForTransaction`,
`computeImputedLines`, `computeSpendReport`, `computeBudgetStatus`, `monthRange`,
`computeDueItems`, `monthlyEquivalentCents`, `computeAiCostCents`, `summarizeAiUsage`,
`transactionReconciliationStatus`, `suggestMatches`.

### L'exemple obligatoire (cahier des charges §5)

Dans le jeu de données : facture `inv-001` (matériel informatique, 3 000,00 € TTC), payée par
la transaction `tx-be-101` (carte `card-be-alice` d'Alice, entité belge), rapprochement
`rec-001` confirmé, allocations `alloc-001a` (Belgique 60 % = 1 800 €) et `alloc-001b`
(Lumen France, centre de coûts projet `cc-fr-paris`, 40 % = 1 200 €). Couvert par
`dataset.spec.ts` et `spend.spec.ts` : total consolidé 3 000 € une seule fois ; Belgique imputé
1 800 € / payé 3 000 € ; France imputé 1 200 € / payé 0 €.

## 4. Services

| Clé `useServices()` | Interface (fichier) | Rôle |
|---------------------|---------------------|------|
| `auth` | `AuthService` (`services/auth/AuthService.ts`) | connexion, inscription, restauration, comptes de démo |
| `organization` | `OrganizationService` | organisation courante, entités accessibles |
| `users` | `UserService` | collaborateurs |
| `suppliers` | `SupplierService` | fournisseurs |
| `categories` | `CategoryService` | catégories (liste, création, modification) |
| `invoices` | `InvoiceService` | factures, correction, validation, import PDF, brouillons |
| `transactions` | `TransactionService` | transactions, justificatifs manquants, comptes, import CSV |
| `cards` | `CardService` | cartes |
| `reconciliations` | `ReconciliationService` | suggestions, confirmation / rejet, manuel |
| `costCenters` | `CostCenterService` | centres de coûts |
| `allocations` | `AllocationService` | ventilation des transactions |
| `budgets` | `BudgetService` | budgets et consommation |
| `subscriptions` | `SubscriptionService` | abonnements fournisseurs, échéances |
| `aiInsights` | `AiInsightService` | analyses IA (lecture, relance, décision) |
| `aiUsage` | `AiUsageService` | tokens, coûts, quota |
| `privacy` | `PrivacyService` | export, suppression, réinitialisation de la démo |
| `dashboard` | `DashboardService` | synthèse organisation / entité |

Chaque méthode renvoie une `Promise` et rejette **toujours** avec une `ApiError`.

### Implémentation mock

- `services/mock/context.ts` : base en mémoire (copie du jeu de données), session simulée,
  horloge de démo, générateur d'identifiants, `reset()`.
- `core/mock/mockRuntime.ts` : chaque méthode passe par `runtime.run('domaine.action', fn)` →
  latence (`VITE_MOCK_LATENCY_MS`, 0 en test), erreur simulée éventuelle, copie profonde du
  résultat (une vue ne peut pas modifier la base par accident).
- `services/mock/access.ts` : contrôles **simulés** — utilisateur connecté (401), permission
  (403), filtrage par organisation et entités accessibles, visibilité « payé par OU imputé à ».
  ⚠ Simulation d'affichage : l'isolation réelle des données doit être faite par le backend A.

### Implémentation http

`httpXxxService.ts` appelle `core/http/httpClient.ts` (fetch) : base `VITE_API_BASE_URL`,
en-tête `Authorization: Bearer <jeton>`, délai `VITE_API_TIMEOUT_MS`, conversion de toute
erreur en `ApiError` (format convenu et format 422 natif FastAPI). Ce sont des **squelettes**
alignés sur `CONTRATS_API.md`, non testés contre un vrai backend.

### Basculer mock → http

```bash
# frontend/.env.local
VITE_API_MODE=http
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Le choix est fait dans `services/index.ts` (`createServices`), nulle part ailleurs. Aucune vue
ne change. Le mode démo (erreurs simulées, comptes de démo, réinitialisation) disparaît en http.

## 5. Erreurs

- `ApiError { code, status, message, details[], operation }` (`core/errors/ApiError.ts`).
- Codes : `INVALID_FILE`, `AI_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`, `NETWORK_ERROR` (les quatre
  erreurs simulables mises en avant), puis `TIMEOUT`, `UNAUTHENTICATED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `RATE_LIMITED`, `SERVER_ERROR`, `UNKNOWN`.
- Messages par défaut en français (`DEFAULT_ERROR_MESSAGES`), affichables tels quels.
- Bus `onApiError` : `main.ts` déconnecte et renvoie à `/connexion` sur un 401.
- Affichage : composant `ErrorMessage` (message, détails par champ, bouton Réessayer) ;
  composable `useAsync` pour les états chargement / erreur.

### Les quatre erreurs simulables (cahier des charges §8)

Proposition technique du groupe, **pas une liste imposée explicitement par le professeur** :

| # | Scénario (`ERROR_SCENARIOS`) | Code | Déclenchement réel en mock | Portée simulée par défaut |
|---|------------------------------|------|----------------------------|---------------------------|
| 1 | `invalidFile` — import d'un fichier invalide | `INVALID_FILE` (422) | PDF non PDF / vide / > 5 Mo / sans `%PDF` ; CSV mal formé (`public/demo/transactions-invalide.csv`, `faux-pdf.pdf`) | `imports` |
| 2 | `aiUnavailable` — service IA indisponible | `AI_UNAVAILABLE` (503) | — (simulé) | `ai` (extraction PDF, relance d'analyse, suggestions de rapprochement) |
| 3 | `aiQuotaExceeded` — quota IA dépassé | `AI_QUOTA_EXCEEDED` (429) | consommation du mois + appel > quota de l'offre | `ai` |
| 4 | `network` — API indisponible / erreur réseau | `NETWORK_ERROR` (0) | en http : serveur injoignable | `*` |

Scénarios complémentaires : `unauthorized` (401), `forbidden` (403), `validation` (422),
`server` (500), `timeout`.

**Déclencher en démonstration** (un seul mécanisme, le simulateur `core/errors/errorSimulator.ts`) :
- bouton **« Mode démo »** dans l'en-tête de l'application (choix du scénario, portée, « une seule fois ») ;
- ou URL : `?demoError=<scénario>[&demoErrorScope=<portée>][&demoErrorMode=once]`,
  `?demoError=off` pour arrêter. Ex. `/app?demoError=network`, `/app/factures/import?demoError=aiUnavailable`.

Ajouter un scénario = ajouter une entrée dans `ERROR_SCENARIOS` (le panneau et l'URL suivent).

## 6. Session, rôles et permissions (SIMULÉS)

- Store `useAuthStore` : `login`, `signUp`, `logout`, `expireSession`, `ensureRestored`,
  `can(permission)`, `canSeeEntity(id)`. Jeton factice dans `sessionStorage`.
- Comptes de démo (mot de passe `demo`) : `alice.admin@…` (admin), `bruno.comptable@…`
  (finance), `chloe.manager@…` (manager Belgique), `david.manager@…` (manager France),
  `emma.collab@…` (member, deux entités), `farid.collab@…` (member France) — domaine
  `cashlens-demo.test`.
- Garde de route (`router/guards.ts`, fonction pure `resolveNavigation`) : route sous `/app`
  sans session → `/connexion?redirect=…` ; permission absente (`meta.permission`) → `/acces-refuse` ;
  page invité avec session → tableau de bord.
- ⚠ **Ce n'est pas de la sécurité** : tout est contournable dans le navigateur. Le backend doit
  authentifier, autoriser et isoler les données lui-même (voir DEPENDANCES_A_C.md).

## 7. Conventions pour les agents suivants

1. Données : `useServices().<domaine>.<méthode>()`, jamais le jeu de données directement.
2. Chargement : `useAsync(() => …)` + `<ErrorMessage :error="…" @retry="…" />`.
3. Montants : `Cents` partout ; afficher avec `formatCents`, saisir avec `parseAmountToCents`,
   répartir avec `allocateByPercentages` / `splitEvenly`. Jamais de `toFixed`, de `* 100` sur un
   flottant, ni de `parseFloat` sur un montant (ESLint bloque `toFixed`).
4. Dépenses : uniquement via `SpendReport` (service dashboard) ou `computeImputedLines` /
   `computeSpendReport`. Toujours libeller « payé par » et « imputé à ».
5. Dates : chaînes ISO ; « aujourd'hui » = `DEMO_TODAY` dans les calculs.
6. Navigation : par nom de route (`RouteName.Xxx`).
7. Permissions UI : `auth.can('invoices:write')` pour masquer / désactiver ; gérer quand même
   `FORBIDDEN` renvoyé par le service.
8. Provenance : afficher `PROVENANCE_LABELS[x.provenance]` sur les données extraites / suggérées.
9. Styles : uniquement les variables de `styles/tokens.css` (l'agent UI les fera évoluer).
10. Tests : un fichier `*.spec.ts` à côté du code ; `createTestServices()` et `loginAs()` de
    `src/test/helpers.ts` pour tester un service ou un store.

## 8. Ajouter un domaine

1. Types : `src/domain/<domaine>.ts`, exportés dans `src/domain/index.ts`.
2. Données fictives : `src/mocks/dataset/…` + champ dans `Dataset` / `SEED` ; compléter `dataset.spec.ts`.
3. Services : `src/services/<domaine>/XxxService.ts` (interface), `mockXxxService.ts`
   (via `ctx.runtime.run('<domaine>.<action>', …)` et `services/mock/access.ts`),
   `httpXxxService.ts` ; brancher les deux dans `services/index.ts`.
4. Contrat : ajouter les endpoints dans `CONTRATS_API.md`.
5. Écran : `src/features/<domaine>/routes.ts` + `views/`, nom dans `router/routeNames.ts`,
   ajout dans `router/routes.ts` et, si besoin, dans `layouts/navigation.ts` et `domain/permissions.ts`.

## 9. Commandes

Voir [`frontend/README.md`](../../frontend/README.md) : `npm run dev`, `build`, `typecheck`,
`lint`, `test`, `e2e`.
