# Contrats REST provisoires — à discuter avec la partie A

> **Statut : PROVISOIRE, non validé.** Ces contrats décrivent ce que le frontend appelle en
> mode `http` (`src/services/*/http*Service.ts`). Ils sont une base de discussion avec la
> partie A, pas une spécification figée. Toute modification se reporte ici ET dans les types
> `src/domain/*` + les squelettes `http*Service.ts`.

## 1. Conventions générales

| Sujet | Convention proposée |
|-------|---------------------|
| Base | `VITE_API_BASE_URL`, ex. `https://api.<domaine>/api/v1` |
| Format | JSON UTF-8, clés en **camelCase** (FastAPI : `alias_generator=to_camel`, `populate_by_name=True`) |
| Montants | **entiers en centimes** (`amountCents: 300000` = 3 000,00 €), jamais de décimaux ; positifs, EUR |
| Pourcentages | entiers en **points de base** (`percentBp: 6000` = 60 %) |
| Dates | `YYYY-MM-DD` ; horodatages ISO 8601 UTC (`2026-11-20T09:00:00Z`) |
| Identifiants | chaînes opaques (UUID conseillé) |
| Authentification | `Authorization: Bearer <token>` sur toutes les routes sauf `/auth/login` et `/auth/signup` |
| Pagination | `?page=1&pageSize=25` → `{ "items": [...], "total": 42, "page": 1, "pageSize": 25 }` |
| Filtres | paramètres de requête optionnels (`entityId`, `status`, `from`, `to`, `search`…) |
| Isolation | le backend filtre TOUJOURS par organisation et par entités accessibles à l'utilisateur du jeton (le filtrage du mock n'est qu'une simulation) |

### Format d'erreur

```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "Le fichier importé n'est pas valide.",
    "details": [{ "field": "ligne 3", "message": "montant invalide (positif attendu)" }]
  }
}
```

Le client accepte aussi le format natif FastAPI (`{"detail": "..."}` ou `{"detail": [{"loc": [...], "msg": "..."}]}`).

| Code (`error.code`) | Statut HTTP | Quand |
|---------------------|-------------|-------|
| `INVALID_FILE` | 422 (ou 415) | fichier importé invalide (type, taille, contenu, ligne CSV) |
| `AI_UNAVAILABLE` | 503 | fournisseur IA (OpenRouter) indisponible / en erreur |
| `AI_QUOTA_EXCEEDED` | 429 | quota de tokens de l'offre atteint (l'appel n'est pas facturé) |
| `UNAUTHENTICATED` | 401 | jeton absent, invalide ou expiré |
| `FORBIDDEN` | 403 | droit insuffisant ou entité non accessible |
| `NOT_FOUND` | 404 | ressource inexistante **ou non visible** pour l'utilisateur |
| `CONFLICT` | 409 | état incompatible (ex. transaction déjà rapprochée, suggestion déjà traitée) |
| `VALIDATION_ERROR` | 422 | données invalides (`details` par champ, ex. `lines.0.quantity`) |
| `RATE_LIMITED` | 429 | limitation générique |
| `SERVER_ERROR` | 5xx | erreur interne |

`NETWORK_ERROR` et `TIMEOUT` sont produits par le client (pas de réponse).

Les schémas JSON ci-dessous renvoient aux types TypeScript de `frontend/src/domain/` (source de vérité côté front).

## 2. Authentification — `AuthService`

| Méthode | Endpoint | Corps | Réponse |
|---------|----------|-------|---------|
| POST | `/auth/login` | `{ email, password }` | `Session` = `{ token, user: User, expiresAt }` |
| POST | `/auth/signup` | `{ firstName, lastName, email, password }` | `Session` |
| GET | `/auth/session` | — (jeton en en-tête) | `Session` (401 si expiré) |
| POST | `/auth/logout` | — | 204 |

`User` : `{ id, organizationId, firstName, lastName, email, role: "admin"|"finance"|"manager"|"member", entityIds: string[], jobTitle, active }`.

## 3. Organisation, utilisateurs, référentiels

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| GET | `/organization` | `Organization` `{ id, name, planId, createdAt }` |
| GET | `/entities` | `LegalEntity[]` accessibles `{ id, organizationId, name, country: "BE"|"FR", vatNumber, registrationNumber, currency }` |
| GET | `/users?entityId=` | `User[]` |
| GET | `/users/{id}` | `User` |
| GET | `/suppliers` | `Supplier[]` |
| GET | `/categories` | `Category[]` `{ id, organizationId, code, name }` |
| POST | `/categories` | corps `{ code, name }` → `Category` |
| PUT | `/categories/{id}` | corps `{ code, name }` → `Category` |
| GET | `/cost-centers?entityId=&type=` | `CostCenter[]` `{ id, entityId, type: "department"|"project", code, name, active }` |
| POST | `/cost-centers` | corps `{ entityId, type, code, name, active }` → `CostCenter` |
| PUT | `/cost-centers/{id}` | idem → `CostCenter` |
| GET | `/cards?entityId=&holderUserId=` | `Card[]` `{ id, entityId, holderUserId, label, last4, network, status, monthlyLimitCents, expiresAt }` |
| GET | `/cards/{id}` | `Card` |

## 4. Factures — `InvoiceService`

| Méthode | Endpoint | Corps / paramètres | Réponse |
|---------|----------|--------------------|---------|
| GET | `/invoices` | `entityId, supplierId, categoryId, status, search, issuedFrom, issuedTo, page, pageSize` | `Page<Invoice>` |
| GET | `/invoices/{id}` | — | `Invoice` |
| PUT | `/invoices/{id}` | `InvoiceInput` (correction humaine) | `Invoice` (provenance `user_corrected`) |
| POST | `/invoices/{id}/validate` | — | `Invoice` (`status: approved`, provenance `recorded`) |
| POST | `/invoices/import-pdf` | `multipart/form-data` : `file` (PDF ≤ 5 Mo) | `InvoiceDraft` |
| POST | `/invoice-drafts/{id}/confirm` | `InvoiceInput` | `Invoice` |

`InvoiceInput` : `{ entityId, supplierId, categoryId, number, issueDate, dueDate, lines: [{ description, quantity, unitPriceCents, vatRateBp }] }`.
Le backend **recalcule** HT / TVA / TTC (TVA arrondie par ligne — à confirmer).

`Invoice` : `InvoiceInput` + `{ id, organizationId, currency: "EUR", status: "to_review"|"approved"|"paid"|"disputed"|"cancelled", lines[].{id, totalExclVatCents, vatCents, totalInclVatCents, provenance}, totalExclVatCents, vatCents, totalInclVatCents, provenance, sourceDocument: { fileName, url, sizeBytes, uploadedAt } | null, createdAt }`.

`InvoiceDraft` : chaque champ extrait est un `ExtractedField` `{ value, provenance: "ai_extracted"|"ai_suggested", confidenceBp }` ; plus `lines`, `tokensUsed`, `simulated` (false côté backend réel).
Erreurs : `INVALID_FILE`, `AI_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`.

## 5. Transactions — `TransactionService`

| Méthode | Endpoint | Corps / paramètres | Réponse |
|---------|----------|--------------------|---------|
| GET | `/transactions` | `entityId, bankAccountId, cardId, direction, reconciliationStatus, missingReceipt, search, bookedFrom, bookedTo, page, pageSize` | `Page<BankTransactionView>` |
| GET | `/transactions/missing-receipts?entityId=` | — | `BankTransactionView[]` |
| GET | `/bank-accounts` | — | `BankAccount[]` |
| GET | `/import-batches` | — | `ImportBatch[]` |
| POST | `/transactions/import-csv` | `multipart/form-data` : `bankAccountId`, `file` | `{ batch: ImportBatch, transactions: BankTransaction[] }` |

`BankTransaction` : `{ id, entityId (payeuse), bankAccountId, bookingDate, label, counterpartyName, amountCents (> 0), direction: "debit"|"credit", currency, source: "csv_import"|"card", cardId, categoryId, categoryProvenance, importBatchId }`.
`BankTransactionView` ajoute `reconciliationStatus: "unmatched"|"suggested"|"matched"` et `missingReceipt: boolean` (débit sans rapprochement confirmé).

### Import CSV (format de démonstration)

```
date;libelle;contrepartie;montant;sens;categorie
2026-11-19;CB LIBRAIRIE DU CENTRE;Librairie du Centre;23,90;debit;OFFICE
```

UTF-8, séparateur `;`, en-tête obligatoire (ordre libre), `date` AAAA-MM-JJ, `montant` positif
(virgule ou point décimal), `sens` = `debit`|`credit`, `categorie` = code facultatif. Fichier ≤ 1 Mo.
Une ligne invalide → `422 INVALID_FILE` avec `details[{ field: "ligne N", message }]`, rien n'est importé.
Exemples : `frontend/public/demo/transactions-valide.csv`, `transactions-invalide.csv`.

## 6. Rapprochements — `ReconciliationService`

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| GET | `/reconciliations?status=&entityId=` | `Reconciliation[]` |
| POST | `/reconciliations/suggest` | `Reconciliation[]` nouvellement suggérés (appel IA : erreurs IA possibles) |
| POST | `/reconciliations/{id}/confirm` | `Reconciliation` (409 si déjà traité ou si facture / transaction déjà rapprochée) |
| POST | `/reconciliations/{id}/reject` | `Reconciliation` |
| POST | `/reconciliations` corps `{ invoiceId, transactionId }` | `Reconciliation` manuel, `confirmed` |

`Reconciliation` : `{ id, invoiceId, transactionId, status: "suggested"|"confirmed"|"rejected", origin: "ai_suggestion"|"manual", confidenceBp, matchReasons: string[], amountDifferenceCents, suggestedAt, decidedAt, decidedByUserId }`.
Règle : au plus 1 rapprochement confirmé par facture et par transaction. Aucun effet sur les totaux de dépenses.

## 7. Allocations — `AllocationService`

| Méthode | Endpoint | Corps | Réponse |
|---------|----------|-------|---------|
| GET | `/allocations?transactionId=&entityId=` | — | `Allocation[]` (explicites uniquement) |
| PUT | `/transactions/{id}/allocations` | `{ allocations: [{ entityId, costCenterId, percentBp }] }` | `Allocation[]` |

Règles : débits uniquement ; somme des `percentBp` = 10 000 exactement (sinon 422) ;
`costCenterId` doit appartenir à `entityId` ; montants **calculés par le backend** au plus grand
reste (à reste égal, ordre des lignes) ; liste vide = retour à l'imputation implicite 100 % entité payeuse.
`Allocation` : `{ id, transactionId, entityId, costCenterId, percentBp, amountCents }`.

## 8. Budgets, abonnements, échéances

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| GET | `/budgets?entityId=&month=YYYY-MM` | `BudgetStatus[]` `{ budget: { id, entityId, categoryId, costCenterId, label, month, amountCents }, consumedCents, remainingCents, consumedBp, overBudget }` |
| GET | `/budgets/{id}` | `BudgetDetail` `{ status: BudgetStatus, lines: (ImputedLine & { label, counterpartyName })[] }` |
| POST | `/budgets` | corps `BudgetInput` `{ entityId, categoryId, costCenterId, label, month, amountCents }` → `Budget` (`budgets:manage`) |
| PUT | `/budgets/{id}` | corps `BudgetInput` → `Budget` (`budgets:manage`) |
| DELETE | `/budgets/{id}` | 204 (`budgets:manage`) |
| GET | `/subscriptions?entityId=` | `RecurringSubscription[]` |
| GET | `/due-items?entityId=&from=&to=` | `DueItem[]` `{ kind: "subscription_renewal"|"invoice_due", sourceId, entityId, label, dueDate, amountCents, overdue }` |

Consommation d'un budget = somme des montants **imputés** (allocations effectives) du mois.

## 9. IA — analyses et consommation

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| GET | `/ai/insights?type=&status=&entityId=` | `AiInsight[]` (lecture des analyses enregistrées, sans appel IA) |
| POST | `/ai/insights/analyze` | `AiInsight[]` (appel IA ; `AI_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`) |
| POST | `/ai/insights/{id}/dismiss` | `AiInsight` |
| POST | `/ai/insights/{id}/resolve` | `AiInsight` |
| GET | `/ai/usage/summary?month=YYYY-MM` | `AiUsageSummary` `{ periodStart, periodEnd, totalTokens, includedTokens, quotaUsedBp, quotaExceeded, totalCostCents, byFeature[] }` |
| GET | `/ai/usage?from=&to=&feature=&userId=&page=&pageSize=` | `Page<AiUsageRecord>` |

`AiInsight.type` : `anomaly`, `duplicate`, `price_increase`, `redundant_subscription`, `optimization`.
Un appel IA en échec ne doit pas être décompté du quota.

## 10. Tableau de bord

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| GET | `/dashboard/summary?entityId=&from=&to=` | `DashboardSummary` (voir `src/domain/dashboard.ts`) |

Le champ `spend` (`SpendReport`) doit respecter les règles de `src/domain/finance/spend.ts` :
dépense = transactions de débit ; « imputé à » vs « payé par » ; invariant Σ imputé = Σ payé = total.
Alternative à discuter : le backend ne fournit que les listes et le frontend calcule la synthèse
avec les mêmes fonctions qu'en mock.

## 11. Confidentialité

| Méthode | Endpoint | Réponse |
|---------|----------|---------|
| POST | `/privacy/export` | `DataExport` `{ id, requestedAt, requestedByUserId, fileName, content }` |
| POST | `/privacy/deletion-requests` corps `{ scope: "my_account"|"organization" }` | `DeletionRequest` |
| GET | `/privacy/deletion-requests` | `DeletionRequest[]` |

La réinitialisation des données de démonstration n'existe qu'en mode mock.
