# CashLens — Landing page : structure et textes

> Textes français définitifs (vouvoiement). Les valeurs entre `{…}` viennent de `config/plans.ts` et ne doivent jamais être écrites en dur.
> Aucun chiffre de performance inventé (pas de « 80 % de temps gagné »), aucun logo client, aucun témoignage : c'est un projet scolaire en démonstration.

## Structure

| # | Section | Ancre | Composants |
|---|---|---|---|
| 0 | Bandeau démonstration | — | bandeau ambre global |
| 1 | En-tête | — | logo, liens d'ancre, « Se connecter », « Essayer la démo » |
| 2 | Hero | `#top` | titre, sous-titre, 2 boutons, aperçu du tableau de bord (capture réelle de l'application en mode démo) |
| 3 | Le problème / la promesse | `#produit` | 3 colonnes |
| 4 | Comment ça marche | `#fonctionnement` | 4 étapes numérotées |
| 5 | Multi-entités et allocation | `#multi-entites` | texte + mini-visuel de l'exemple 3 000 € |
| 6 | L'IA, sous votre contrôle | `#ia` | 5 badges de provenance réels + 4 points |
| 7 | Fonctionnalités | `#fonctionnalites` | grille de 6 cartes |
| 8 | Offres (2 paliers) | `#offres` | 2 cartes depuis la config |
| 9 | Confidentialité et RGPD | `#confidentialite` | 4 points + lien |
| 10 | FAQ | `#faq` | 5 questions (`<details>`) |
| 11 | Appel final | — | titre + bouton |
| 12 | Pied de page | — | liens, mention projet scolaire |

Responsive : hero en une colonne sur mobile (aperçu sous le texte), deux colonnes ≥ 1024 px ; grilles 1 → 2 → 3 colonnes ; cartes d'offre empilées sur mobile, côte à côte ≥ 768 px.

## Textes

### 1. En-tête
- Liens : **Produit** · **IA et transparence** · **Offres** · **Confidentialité**
- Boutons : **Se connecter** · **Essayer la démo**

### 2. Hero
- Sur-titre : **Gestion des dépenses d'entreprise**
- Titre (h1) : **Sachez qui dépense quoi, pour quelle entité et pourquoi.**
- Sous-titre : CashLens centralise vos factures, cartes, transactions et budgets. L'IA extrait les données et propose les rapprochements ; vous gardez la décision finale.
- Bouton principal : **Essayer la démo**
- Bouton secondaire : **Voir les offres**
- Mention sous les boutons : Démonstration avec des données fictives. Aucune inscription réelle requise.
- Texte alternatif de l'aperçu : « Tableau de bord CashLens : dépenses totales, dépenses par entité, factures à valider et suggestions de l'IA. »

### 3. Le problème / la promesse
- Titre (h2) : **Vos dépenses sont dispersées. Vos décisions ne devraient pas l'être.**
- Colonne 1 — **Tout au même endroit** : Factures PDF, relevés de cartes et transactions bancaires réunis dans un seul espace, pour chaque entité de votre organisation.
- Colonne 2 — **Moins de saisie** : L'IA lit vos factures et en extrait fournisseur, lignes, dates, montants et catégorie. Vous n'avez plus qu'à vérifier.
- Colonne 3 — **Une vue claire** : Dépenses par entité, collaborateur, carte, catégorie, département ou projet, comparées à vos budgets.

### 4. Comment ça marche
- Titre (h2) : **De la facture à l'analyse, en quatre étapes**
1. **Importez** — Déposez une facture PDF ou un export CSV de vos transactions.
2. **L'IA extrait** — Fournisseur, lignes, dates, montants et catégorie sont proposés automatiquement, avec leur provenance indiquée.
3. **Vous validez** — Vous corrigez si nécessaire, puis confirmez les données et les rapprochements entre factures et paiements.
4. **Vous analysez** — Tableaux de bord, budgets, abonnements et alertes se mettent à jour à partir des seules données validées.

### 5. Multi-entités et allocation
- Titre (h2) : **Une organisation, plusieurs entités, un seul total**
- Texte : Une facture payée par l'entité belge peut concerner un projet en France. CashLens répartit la dépense entre plusieurs imputations analytiques, sans la dupliquer.
- Visuel (exemple) :
  - Facture de matériel informatique : **3 000 €**, payée par Alice avec une carte de l'entité Belgique
  - Belgique : **60 % — 1 800 €**
  - Projet France : **40 % — 1 200 €**
  - Total consolidé : **3 000 €**
- Note : Une seule facture, un seul paiement, plusieurs imputations. Aucune dépense supplémentaire, aucune écriture intersociétés.

### 6. L'IA, sous votre contrôle
- Titre (h2) : **L'IA vous assiste. Elle ne décide pas à votre place.**
- Intro : Chaque information affichée indique d'où elle vient. Vous savez toujours ce qui a été proposé par l'IA et ce qui a été vérifié par une personne.
- Légende (badges réels) :
  - **Suggestion IA** — une proposition, appliquée seulement si vous la confirmez.
  - **Extrait par l'IA** — une valeur lue automatiquement dans un document, à vérifier.
  - **Corrigé** — une valeur modifiée par un membre de votre équipe.
  - **Validé** — une valeur confirmée par un membre de votre équipe.
  - **Enregistré** — une donnée financière définitive, utilisée pour les calculs.
- Points :
  - **Validation humaine obligatoire** — Un rapprochement proposé ne devient définitif qu'après votre confirmation.
  - **Analyses expliquées** — Anomalies, doublons potentiels, hausses de prix, abonnements redondants : chaque suggestion montre les données sur lesquelles elle s'appuie.
  - **Consommation visible** — Tokens utilisés, coût estimé et quota restant sont consultables à tout moment.
  - **Toujours une alternative** — Si l'IA est indisponible ou si votre quota est atteint, la saisie manuelle reste possible.

### 7. Fonctionnalités
- Titre (h2) : **Tout ce qu'il faut pour piloter vos dépenses**
- **Factures et extraction** — Import de factures PDF textuelles, extraction des lignes, correction et validation.
- **Transactions et cartes** — Import CSV, cartes multiples par collaborateur, rattachées à leur entité.
- **Rapprochement** — Suggestions d'association entre factures et paiements, confirmées par vous.
- **Justificatifs manquants** — Les paiements sans facture sont listés pour être complétés.
- **Budgets et abonnements** — Seuils d'alerte, budgets consommés et restants, échéances à venir.
- **Rôles et entités** — Chaque membre voit les entités et les actions qui le concernent.

### 8. Offres
- Titre (h2) : **Deux formules, selon la taille de votre organisation**
- Sous-titre : Tarifs indicatifs pendant la phase de démonstration.
- Carte (×2, depuis la config) :
  - Nom : `{plan.name}`
  - Accroche : `{plan.tagline}`
  - Prix : `{formatCents(plan.monthlyPriceCents)}` **HT / mois** — mention dessous : *Tarif indicatif, non contractuel*
  - Liste :
    - `{plan.maxEntities}` entité / entités (accord au pluriel si > 1)
    - Jusqu'à `{plan.maxUsers}` utilisateurs
    - `{plan.includedAiTokensPerMonth formaté}` tokens IA inclus par mois
    - puis `{plan.features[]}`
  - Si `aiHardLimit` : « Au-delà du quota, les fonctions IA sont suspendues jusqu'au mois suivant ; la saisie manuelle reste disponible. »
  - Bouton : **Choisir {plan.name}** (lien `/inscription?plan={plan.id}`)
- Mise en avant : la seconde carte porte un badge « Multi-entités » (fait objectif, pas « Populaire »).
- Note sous les cartes : Prix, quotas et contenu des formules sont en cours de validation et peuvent évoluer.
- Point d'arbitrage : HT ou TTC (voir rapport) — par défaut « HT », usage B2B.

### 9. Confidentialité et RGPD
- Titre (h2) : **Vos données restent les vôtres**
- **Données minimales** — Aucune donnée bancaire sensible : les cartes sont identifiées par leurs quatre derniers chiffres.
- **Transparence sur l'IA** — Nous indiquons quelles informations sont transmises au service d'IA et pourquoi.
- **Isolation par organisation** — Chaque organisation ne voit que ses propres données, et chaque membre uniquement ce que son rôle autorise.
- **Droit à l'effacement** — Vous pouvez exporter ou supprimer vos données depuis l'application.
- Lien : **Lire la politique de confidentialité et de transparence IA**

### 10. FAQ
1. **Les données de la démonstration sont-elles réelles ?** — Non. Toutes les factures, transactions et personnes sont fictives. La connexion est simulée et aucune donnée n'est envoyée à un service externe.
2. **L'IA peut-elle valider une facture à ma place ?** — Non. L'IA propose des valeurs et des rapprochements ; seule une personne autorisée peut les valider.
3. **Que se passe-t-il si l'IA se trompe ?** — Chaque valeur extraite peut être corrigée avant validation. La correction est conservée dans l'historique de la facture.
4. **Puis-je gérer plusieurs sociétés ?** — Oui, avec la formule multi-entités : chaque entité a ses cartes, ses budgets et son tableau de bord, et une vue consolidée réunit l'ensemble.
5. **CashLens remplace-t-il mon logiciel comptable ?** — Non. CashLens organise et analyse vos dépenses ; il ne tient pas la comptabilité générale.

### 11. Appel final
- Titre (h2) : **Voyez CashLens en action**
- Texte : Explorez la démonstration avec une organisation fictive présente en Belgique et en France.
- Bouton : **Essayer la démo**

### 12. Pied de page
- Colonnes : Produit (Fonctionnalités, Offres) · Transparence (IA et transparence, Confidentialité) · Accès (Se connecter, Essayer la démo)
- Mention : CashLens — projet scolaire. Démonstration avec des données fictives.
