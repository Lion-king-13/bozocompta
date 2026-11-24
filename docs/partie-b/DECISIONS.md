# Partie B — Décisions métier et techniques (provisoires)

> Statut : **provisoire, à faire valider par le groupe**. Les arbitrages D1 à D13 ont été
> rendus par l'orchestrateur de la partie B ; les choix H1 et suivants sont des hypothèses
> de l'architecture frontend, faute d'information plus précise.
> Référence fonctionnelle : [`docs/frontend-requirements.md`](../frontend-requirements.md).

## Arbitrages de l'orchestrateur (D1 – D13)

| # | Décision | Où c'est appliqué |
|---|----------|-------------------|
| D1 | **Unité de dépense = la transaction de débit.** Une facture n'ajoute jamais rien aux totaux ; le rapprochement n'est qu'un lien. Confirmer, rejeter ou laisser en attente une suggestion ne change aucun total. Facture non payée = « à payer », hors dépenses. Transaction sans facture = dépense comptée + justificatif manquant. | `domain/finance/spend.ts` (`computeImputedLines`, `computeSpendReport`), `DashboardSummary.toPayCents`, test « confirmer ou rejeter une suggestion ne change aucun total » |
| D2 | Deux lectures **toujours libellées** : « payé par » (entité de la carte / du compte) et « imputé à » (ventilation). Dashboards entité : imputé par défaut, payé en secondaire. Invariant : Σ imputé par entité = Σ payé par entité = total organisation. Sans allocation explicite : 100 % imputé à l'entité payeuse. | `SpendReport.imputedTotalCents` / `paidTotalCents`, `imputedByEntity` / `paidByEntity`, `allocationsForTransaction`, test d'invariant |
| D3 | Cible d'allocation = **entité obligatoire + centre de coûts facultatif**. Un seul modèle `CostCenter` de type `department` ou `project`, rattaché à une entité. « Projet France » = centre de coûts `project` de Lumen France (`cc-fr-paris`). Pas de modèle Projet / Département séparé. | `domain/analytics.ts` |
| D4 | L'allocation porte sur la **transaction** (montant payé, TTC). Les 3 000 € de l'exemple sont TTC ; la facture garde HT / TVA / TTC à titre informatif. Devise unique EUR. Pas d'avoirs ni de montants négatifs (transaction = montant positif + `direction`). | `Allocation.transactionId`, `BankTransaction.direction` |
| D5 | Allocation = **liste plate (cible, pourcentage)**. Les pourcentages font foi (somme = 100 % exactement, sinon refus), montants dérivés par plus grand reste ; à reste égal, le centime va aux premières lignes dans l'ordre. Pas de cascade ni de règle récurrente. | `core/money` (`allocateByPercentages`), `validateAllocationInputs`, `buildAllocations` |
| D6 | Rapprochement simple **1 facture ↔ 1 transaction** au plus de chaque côté. Suggestion = montant identique + date proche + fournisseur, score indicatif. États suggéré → confirmé / rejeté (par qui, quand). | `domain/reconciliation.ts`, `suggestMatches`, `ReconciliationService` (`CONFLICT` sinon) |
| D7 | Rôles simulés : `admin`, `finance`, `manager`, `member`. Un utilisateur limité voit les pièces dont l'entité payeuse **ou** une entité imputée lui est accessible. Simulation d'affichage, pas une sécurité. | `domain/user.ts`, `domain/permissions.ts`, `services/mock/access.ts` |
| D8 | « Abonnement » = abonnement **fournisseur** récurrent ; les paliers CashLens s'appellent « offre / plan ». « Échéance » = date à venir : renouvellement d'abonnement ou date limite d'une facture. | `RecurringSubscription`, `Plan`, `DueItem` (`computeDueItems`) |
| D9 | Provenance : `ai_extracted`, `ai_suggested`, `user_corrected`, `validated` (action de l'utilisateur), `recorded` (accepté et persisté par le service ; en mock : l'état en mémoire). | `domain/provenance.ts` |
| D10 | **Horloge de démo figée** (une constante), jamais `new Date()` dans un calcul. Budgets **mensuels** par entité et/ou catégorie et/ou centre de coûts, consommés sur l'imputé. | `config/demo.ts` (`DEMO_TODAY` = 2026-11-20), `domain/budget.ts`, `computeBudgetStatus` |
| D11 | Quota IA affiché = quota de l'offre (configuration), pas le crédit réel de 1 €. Prix par token = valeur indicative, libellée comme telle. Un appel IA échoué ne consomme pas de quota. | `config/plans.ts`, `services/mock/aiQuota.ts`, test « un appel IA échoué ne consomme pas » |
| D12 | Import PDF en mock : contrôle **réel** (type, taille, en-tête `%PDF`) → « fichier invalide » ; extraction **simulée** et déterministe (`InvoiceDraft.simulated = true`, à annoncer dans l'interface). Import CSV : vrai parsing, format documenté. | `services/invoices/pdfCheck.ts`, `services/transactions/csvParser.ts` |
| D13 | Suppression des données : effet réel sur l'état mock en mémoire pour la session, + action « réinitialiser les données de démonstration » ; un rechargement restaure le jeu initial. Inscription : session simulée dans l'organisation de démo, annoncée comme telle. | `PrivacyService`, `AuthService.signUp` |

### Choix antérieurs alignés sur ces arbitrages

Avant réception des arbitrages, l'architecture avait :
- ventilé les **factures** (base HT puis TTC) au lieu des transactions → remplacé par D1/D4 ;
- prévu des modèles `Project` et `Department` séparés → remplacés par `CostCenter.type` (D3) ;
- nommé les rôles `org_admin` / `accountant` / `entity_manager` / `employee` → renommés (D7) ;
- stocké des échéances d'abonnement (`ScheduledPayment`) → remplacées par des `DueItem` calculés (D8).

## Hypothèses de l'architecture frontend (H1 – …)

| # | Hypothèse | Pourquoi |
|---|-----------|----------|
| H1 | Montants en **centimes entiers**, pourcentages et taux en **points de base** (1 % = 100). | Aucun flottant dans les calculs ; 33,33 % représentable exactement. |
| H2 | TVA arrondie **par ligne** de facture (arrondi commercial, moitié loin de zéro). | Règle la plus courante ; à confirmer avec A. |
| H3 | Une **catégorie par facture** et une par transaction (pas par ligne). Les dépenses par catégorie utilisent la catégorie de la **transaction**. | Simplicité ; cohérent avec D1. |
| H4 | « Justificatif manquant » = débit **sans rapprochement confirmé** (une suggestion en attente ne suffit pas). | L'IA ne remplace pas la validation humaine. |
| H5 | Un `member` ne voit que **ses propres cartes** ; les autres listes restent filtrées par entité. | Lecture naturelle du rôle « collaborateur ». |
| H6 | Inscription simulée : rôle `member` sur l'entité belge. | D13 ne précise pas le rôle. |
| H7 | Statuts de facture : `to_review`, `approved`, `paid`, `disputed`, `cancelled`. Sans workflow d'approbation (hors périmètre). | Minimum pour « factures à valider » et « à payer ». |
| H8 | Période par défaut des dashboards : du 1er janvier à la date de démo (cumul annuel). | Inclut l'exemple obligatoire (septembre 2026). |
| H9 | Offres : « Essentiel » 49 €/mois, 200 000 tokens ; « Pro » 149 €/mois, 1 000 000 tokens ; quota strict. Coût indicatif : 3 € / million de tokens. | Valeurs fictives non validées, toutes dans `config/plans.ts`. |
| H10 | Opérations nommées `domaine.action` ; celles qui appellent l'IA commencent par `ai.` et les imports par `imports.`. | Permet de cibler les erreurs simulées (« IA indisponible » ne bloque pas la consultation). |
| H11 | Format CSV : `;`, en-tête `date;libelle;contrepartie;montant;sens[;categorie]`, date AAAA-MM-JJ, montant positif, virgule décimale. Un fichier avec une seule ligne invalide est refusé en entier. | Simple à expliquer ; à confirmer avec A. |
| H12 | Session simulée conservée dans `sessionStorage` (jeton factice), perdue à la fermeture de l'onglet. | Démo réaliste, sans prétendre à de la sécurité. |
