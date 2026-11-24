# CashLens — Parcours UX et écrans

> Spécification fonctionnelle de l'interface (partie B). S'appuie sur `DESIGN_SYSTEM.md` pour les composants.
> Les noms de rôles (`admin`, `finance`, `manager`, `member`) et de permissions renvoient à la matrice **provisoire** du code (`domain/permissions.ts`) ; le contrôle réel des droits reste au backend.
> Les quatre erreurs simulables (§8) sont une proposition technique, pas une liste imposée.

## 1. Architecture de navigation

### 1.1 Coque publique (non connecté)

En-tête : logo CashLens · liens d'ancre « Produit », « IA et transparence », « Offres », « Confidentialité » · boutons « Se connecter » (secondaire) et « Essayer la démo » (principal).
Mobile : logo + bouton menu (tiroir plein écran avec les mêmes liens, puis les deux boutons empilés pleine largeur).
Pied de page : liens Confidentialité, Transparence IA, mention « Projet scolaire — démonstration ».

### 1.2 Coque applicative (connecté)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⓘ Mode démonstration — données fictives · [Simuler une erreur ▾]│  bandeau (toujours visible en mode mock)
├──────────────┬──────────────────────────────────────────────────┤
│ ◎ CashLens   │  Fil d'Ariane                                     │
│ Périmètre    │  Titre de page            [action] [action princ.]│
│ [Org. consolidée ▾]                                             │
│              │                                                   │
│ Pilotage     │  contenu                                          │
│  Tableau de bord                                                │
│  Analyses IA (3)                                                │
│ Dépenses     │                                                   │
│  Factures (4)│                                                   │
│  Transactions│                                                   │
│  Rapprochements (2)                                             │
│  Justificatifs manquants (5)                                    │
│  Allocations │                                                   │
│ Pilotage budgétaire                                             │
│  Budgets     │                                                   │
│  Abonnements et échéances                                       │
│ Référentiels │                                                   │
│  Cartes · Collaborateurs · Catégories · Centres de coûts        │
│ Administration                                                  │
│  Consommation IA · Paramètres · Confidentialité                 │
│              │                                                   │
│ [AM] Alice Martin ▾                                             │
│     Finance · Belgique                                          │
└──────────────┴──────────────────────────────────────────────────┘
```

- **Desktop (≥ 1024 px)** : barre latérale fixe 248 px, fond pétrole 900. Groupes titrés (Pilotage, Dépenses, Pilotage budgétaire, Référentiels, Administration). Élément actif : fond plus clair + liseré ambre + `aria-current="page"`. Compteurs (factures à valider, rapprochements en attente, justificatifs manquants, suggestions IA ouvertes) en pastilles ; ce sont des compteurs du périmètre sélectionné.
- **Mobile et tablette (< 1024 px)** : barre supérieure 56 px : bouton menu (ouvre la navigation en tiroir à gauche, piège du focus et Échap comme une modale), logo, sélecteur de périmètre compact, avatar. Pas de barre d'onglets en bas : 15 destinations ne tiennent pas dans 4-5 onglets, le tiroir est plus honnête.
- **Entrées masquées par rôle** : une entrée de navigation pour laquelle l'utilisateur n'a pas la permission `:read` n'est pas affichée. Un accès direct par URL mène à la page « Accès refusé » (§ 3.25).

### 1.3 Sélecteur de périmètre (entité)

- Libellé « Périmètre ». Options : **Organisation consolidée**, **Belgique**, **France** (liste issue du service, limitée aux entités de l'utilisateur ; « Organisation consolidée » seulement si l'utilisateur voit plusieurs entités).
- `<select>` natif (accessible, mobile). Le choix est conservé dans l'URL (`?entity=be`) pour qu'un lien partagé montre le même périmètre, et mémorisé pour la session.
- Changer de périmètre recharge les données de la page **sans** changer de page ; un toast poli n'est pas nécessaire (le titre de page affiche le périmètre : « Tableau de bord — Belgique »).
- Couleur d'entité constante partout : Belgique = `--chart-cat-1`, France = `--chart-cat-2`.

### 1.4 Menu utilisateur

Avatar (initiales) + nom + rôle et entité principale. Contenu : « Paramètres », « Confidentialité et mes données », « Changer d'utilisateur de démonstration » (mode mock uniquement : liste des comptes fictifs par rôle), séparateur, « Se déconnecter ».

### 1.5 Indicateur de mode démonstration

- Bandeau ambre en haut de **chaque** page (publique et applicative) tant que le mode mock est actif : « **Mode démonstration** — données fictives, aucune donnée réelle n'est envoyée. »
- À droite du bandeau (desktop) ou dans le menu utilisateur (mobile) : menu « Simuler une erreur » listant les scénarios (`INVALID_FILE`, `AI_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`, `NETWORK_ERROR`, puis les autres). Le scénario actif est affiché dans le bandeau (« Erreur simulée active : Service IA indisponible · Désactiver ») pour qu'aucune démonstration ne soit trompeuse. Le paramètre d'URL `?simulateError=` existant reste disponible.
- Non masquable (pas de bouton fermer) : c'est une exigence d'honnêteté.

## 2. Les quatre erreurs simulables : où et comment elles apparaissent

| Erreur | Déclencheur en démo | Écrans concernés | Rendu | Sortie proposée |
|---|---|---|---|---|
| 1. Fichier invalide (`INVALID_FILE`) | Déposer un fichier non PDF / non CSV, vide, trop lourd, CSV mal formé ; ou scénario simulé | Import PDF, Import CSV | Contrôle immédiat dans `FileDropZone` (extension, taille) → message sous la zone ; erreur serveur (contenu illisible, colonnes manquantes) → `BaseAlert tone="danger"` au-dessus de la zone, avec le détail (ligne et colonne pour un CSV) | « Choisir un autre fichier » ; lien « Voir le format attendu » (CSV) |
| 2. Service IA indisponible (`AI_UNAVAILABLE`) | Scénario simulé | Import PDF (extraction), Rapprochement (suggestions), Analyses IA, tableau de bord (carte suggestions) | Import PDF : la facture est créée **sans** extraction, `BaseAlert tone="warning" live` « Le service d'IA est momentanément indisponible. Vous pouvez saisir les données manuellement. » ; ailleurs : `ErrorState` local dans la carte concernée, le reste de la page fonctionne | « Réessayer l'extraction », « Saisir manuellement » ; Rapprochement : « Rapprocher manuellement » |
| 3. Quota IA dépassé (`AI_QUOTA_EXCEEDED`) | Scénario simulé, ou compteur de démo à 100 % | Import PDF, Rapprochement, Analyses IA, Consommation IA, tableau de bord | `BaseAlert tone="danger"` « Le quota IA de votre formule est atteint pour ce mois. » + `ProgressBar` à 100 % (hachurée) ; boutons d'action IA désactivés avec explication (pas seulement grisés) ; avertissement préalable à 80 % (`tone="warning"`) | « Voir la consommation IA » ; saisie manuelle toujours possible ; mention de la date de renouvellement du quota |
| 4. API indisponible / réseau (`NETWORK_ERROR`, `TIMEOUT`, `SERVER_ERROR`) | Scénario simulé | Tous les écrans | Chargement initial : `ErrorState` à la place du contenu (« Impossible de joindre le serveur. Vos données ne sont pas perdues. ») ; action (enregistrer, valider) : toast d'erreur assertif + formulaire **conservé** tel quel | « Réessayer » (relance la même requête) |

Règle commune : l'erreur est dite là où l'utilisateur regarde, sans perdre sa saisie, avec une action de sortie. Le code technique (ex. `AI_QUOTA_EXCEEDED`) est affiché discrètement en mode démonstration seulement, pour la soutenance.

## 3. Écrans

Pour chaque écran : objectif · contenu · actions · états. Les états standard sont :
- **Chargement** : `LoadingSkeleton` à la forme du contenu (KPI, tableau, carte), jamais un spinner plein écran.
- **Vide** : `EmptyState` qui explique et propose l'action suivante.
- **Erreur** : `ErrorState` avec « Réessayer » (réseau) ; erreurs spécifiques selon § 2.
- **Accès refusé** : section masquée si c'est une partie de page ; page « Accès refusé » si c'est toute la route ; bouton d'action absent (pas désactivé) si l'utilisateur ne peut pas l'utiliser, sauf quand l'absence prêterait à confusion (alors désactivé + phrase d'explication).

---

### Partie publique

#### 3.1 Landing page
Voir `LANDING_CONTENU.md` pour la structure et les textes définitifs. Points UX :
- Les **deux paliers** (Essentiel, Pro) sont lus depuis `config/plans.ts` (nom, accroche, prix, entités, utilisateurs, quota de tokens, fonctionnalités) : aucun prix écrit en dur dans la page.
- Chaque prix porte la mention « Tarif indicatif — non contractuel » et la section se termine par « Tarifs et quotas en cours de validation. »
- Les boutons d'offre mènent à l'inscription simulée avec le palier pré-sélectionné (`/inscription?plan=plan-pro`).
- États : page statique, pas de chargement réseau (config locale). Si la config de paliers était vide : la section Offres affiche « Nos offres seront bientôt disponibles. » (pas de carte vide).

#### 3.2 Connexion (simulée)
- **Objectif** : entrer dans la démo avec un rôle donné, sans laisser croire à une vraie authentification.
- **Contenu** : `BaseAlert tone="info"` en tête : « Connexion simulée : aucun mot de passe n'est vérifié et aucune donnée n'est envoyée. Choisissez un profil de démonstration. » Liste de profils sous forme de cartes cliquables (Alice Martin — Finance · Belgique ; un Administrateur ; un Manager d'entité France ; un Collaborateur), chacune avec le résumé de ce que le rôle peut faire. Formulaire e-mail / mot de passe présent pour montrer le futur parcours, **pré-rempli et désactivé** avec la mention « Disponible avec le backend ».
- **Actions** : « Continuer avec ce profil » ; lien « Créer un compte de démonstration ».
- **États** : chargement (bouton `loading`) ; erreur réseau simulée → toast d'erreur, reste sur la page ; session expirée (401) → retour ici avec `BaseAlert tone="warning"` « Votre session a expiré. Reconnectez-vous. » puis redirection vers la page demandée.

#### 3.3 Inscription (simulée)
- **Contenu** : même avertissement « Inscription simulée ». Champs : nom de l'organisation, prénom et nom, e-mail professionnel, palier (Essentiel / Pro, pré-sélectionné par l'URL, prix indicatif rappelé), entités à créer (Belgique, France cochées par défaut dans la démo), case obligatoire « J'ai lu la politique de confidentialité et la note de transparence IA » (liens).
- **Actions** : « Créer l'organisation de démonstration » → arrive sur le tableau de bord avec un toast « Organisation de démonstration créée. Les données sont fictives. »
- **Validation** : erreurs par champ au submit, focus sur le premier champ en erreur, résumé en haut si plusieurs erreurs.
- **Quota** : si le palier choisi est Essentiel et plus d'une entité est cochée → message sous le champ « La formule Essentiel inclut 1 entité. Choisissez Pro ou ne gardez qu'une entité. » (limite lue dans la config).

#### 3.4 Confidentialité et transparence IA (publique)
- **Contenu** (page de texte structurée, sommaire ancré) : quelles données sont traitées ; ce que fait l'IA (extraction des fournisseurs, lignes, dates, montants, catégories ; suggestions de rapprochement ; analyses) et ce qu'elle ne fait pas (elle ne valide rien, n'enregistre rien seule) ; légende des cinq états de provenance avec les vrais badges ; données envoyées au service d'IA (contenu textuel des factures, pas de données bancaires sensibles) ; durée de conservation (à compléter par l'équipe) ; droits RGPD (accès, rectification, effacement, portabilité) et où les exercer dans l'application ; mention du mode démonstration.
- Aucun nom de modèle ni de fournisseur d'IA tant que le choix n'est pas validé : « un service d'IA externe ».

---

### Partie authentifiée

#### 3.5 Tableau de bord consolidé (Organisation consolidée)
- **Objectif** : comprendre en 10 secondes qui dépense quoi, pour quelle entité, et ce qui demande une action.
- **Contenu, de haut en bas** :
  1. `PageHeader` « Tableau de bord — Organisation consolidée », sélecteur de période (mois en cours par défaut ; mois précédent ; trimestre ; année).
  2. Rangée « À traiter » (cartes cliquables vers les listes filtrées) : Factures à valider · Rapprochements en attente · Justificatifs manquants · Suggestions IA ouvertes.
  3. KPI : Dépenses totales (variation vs période précédente, hausse = défavorable) · Budget consommé (% et montant restant) · Abonnements actifs (coût mensuel) · Prochaines échéances (7 jours).
  4. Dépenses par entité (barres horizontales Belgique / France, total consolidé affiché ; **le total consolidé égale la somme des factures, les allocations ne créent aucune dépense** — une note « Les imputations analytiques répartissent les dépenses sans les dupliquer » sous le graphique).
  5. Évolution des coûts (courbe 12 mois, une série par entité, ≤ 2 séries + total en pointillé).
  6. Dépenses par catégorie (barres triées) et par département / projet (barres) — côte à côte en desktop.
  7. Top collaborateurs et top cartes (tableaux courts, 5 lignes, lien « Tout voir »).
  8. Budgets : 4 `ProgressBar` les plus consommés.
  9. Anomalies et suggestions IA : 3 dernières, chaque élément avec `AiProvenanceBadge provenance="suggested"`, type (Anomalie, Doublon potentiel, Hausse de prix, Abonnement redondant, Optimisation), montant concerné, actions « Examiner » / « Ignorer ».
- Chaque graphique a un lien « Voir les données » (tableau accessible) et une légende.
- **États** : chargement par bloc (squelettes KPI + cartes), chaque bloc échoue indépendamment (`ErrorState compact` dans la carte) ; vide (organisation sans données) : `EmptyState` global « Commencez par importer une facture ou des transactions » avec deux boutons ; IA indisponible ou quota : seule la carte suggestions affiche l'erreur.
- **Rôles** : `member` ne voit pas ce tableau consolidé (il voit « Mes dépenses ») — à confirmer.

#### 3.6 Tableau de bord par entité
- Même structure, filtrée sur l'entité sélectionnée ; le titre l'indique. La carte « Dépenses par entité » est remplacée par « Dépenses par centre de coûts ». Une dépense de l'entité imputée en partie à une autre entité (ex. 40 % Projet France) est montrée avec la mention « dont 1 200,00 € imputés au Projet France » pour expliquer l'écart entre « payé par l'entité » et « imputé à l'entité ».
- Point d'arbitrage : quel montant le KPI principal affiche par défaut — payé par l'entité ou imputé à l'entité (voir rapport).

#### 3.7 Factures (liste)
- **Contenu** : `PageHeader` avec « Importer une facture » (principal). Filtres sur une ligne (repliés dans un panneau « Filtres » sur mobile) : recherche fournisseur / numéro, statut, entité, période, collaborateur, catégorie, provenance (« Extraites par l'IA, non validées »). Onglets rapides : Toutes · À valider (n) · Validées · Contestées. `DataTable` : Fournisseur, N°, Date, Entité, Collaborateur, Statut, Rapprochement, Montant TTC. Pagination.
- **Actions** : ouvrir le détail ; importer ; (finance/admin) valider en lot les factures dont toutes les valeurs sont validées — hors MVP si trop complexe.
- **États** : vide « Aucune facture pour l'instant » + Importer ; vide après filtre « Aucune facture ne correspond à ces filtres » + « Effacer les filtres » ; erreur réseau ; `member` ne voit que ses factures.

#### 3.8 Import PDF
- **Objectif** : transformer une facture PDF textuelle en données vérifiables.
- **Étapes visibles (indicateur 1-2-3)** : 1. Déposer · 2. Extraction par l'IA · 3. Vérifier et valider.
- **Étape 1** : `FileDropZone accept=".pdf"`, aide « PDF textuel (non scanné), 10 Mo maximum. N'utilisez pas de vraie facture : la démonstration fournit des exemples. » + bouton « Utiliser une facture d'exemple » (liste des PDF fictifs, dont la facture Dell 3 000 €). Choix de l'entité et du collaborateur (pré-remplis avec ceux de l'utilisateur). Rappel du quota restant : « Cette extraction utilisera environ N tokens. Il vous reste X tokens ce mois-ci. »
- **Étape 2** : écran d'attente explicite (« L'IA lit la facture… ») avec squelette du formulaire ; durée simulée courte ; bouton « Annuler ».
- **Étape 3** : redirige vers l'écran de correction (§ 3.9).
- **Erreurs** : fichier invalide (contrôle local + serveur, § 2) ; IA indisponible → la facture est créée en brouillon, on arrive à l'étape 3 avec des champs vides (`provenance` absente) et une alerte ; quota dépassé → alerte avant même le dépôt (zone désactivée avec l'explication), saisie manuelle proposée.
- **Rôles** : nécessite `invoices:import`.

#### 3.9 Détail de facture et correction / validation des données extraites
- **Objectif** : l'utilisateur vérifie chaque valeur extraite, corrige si besoin, puis valide. C'est l'écran clé de la transparence IA.
- **Mise en page** : desktop 2 colonnes — à gauche l'aperçu du document (texte extrait / rendu du PDF fictif), à droite le formulaire ; mobile : onglets « Données » / « Document ».
- **En-tête** : `PageHeader` « Facture F-2026-0142 », meta : `StatusBadge` (À valider) + `AiProvenanceBadge` global (« Extrait par l'IA · 11/11/2026 »). Légende des provenances repliable.
- **Formulaire** : Fournisseur, N° de facture, Date, Échéance, Entité, Collaborateur, Carte, Catégorie (suggestion IA), Devise (EUR). Chaque champ porte son badge de provenance dans le libellé et une teinte de fond : extrait → indigo doux ; dès que l'utilisateur modifie la valeur, badge « Corrigé » prune et lien « Revenir à la valeur extraite ». Valeur extraite d'origine visible au survol / sous le champ (« Valeur extraite : 3 000,00 € »).
- **Lignes** (`BaseTabs` « Lignes / Imputations / Historique ») : tableau éditable Description, Quantité, Prix unitaire HT, TVA, Total ; totaux HT / TVA / TTC **recalculés** et contrôle de cohérence : si la somme des lignes ≠ total extrait → `BaseAlert tone="warning"` « Le total des lignes (2 950,00 €) diffère du total extrait (3 000,00 €). Vérifiez les lignes. » (le calcul fait foi côté backend).
- **Imputations** : renvoie vers l'écran d'allocation (§ 3.14) ou l'intègre en onglet.
- **Historique** : journal « Extrait par l'IA le … », « Montant corrigé par Alice Martin le … (2 950,00 € → 3 000,00 €) », « Validé par … », « Enregistré ».
- **Actions** (barre fixe en bas sur mobile) : « Valider et enregistrer » (principal ; demande que les champs obligatoires soient remplis ; une case « J'ai vérifié les données extraites » si au moins une valeur est encore « Extrait par l'IA ») · « Enregistrer le brouillon » · « Rejeter… » (`BaseDialog alert` avec motif).
- **Après validation** : tous les badges passent à « Validé » puis « Enregistré » ; les champs deviennent en lecture seule ; toast « Facture validée et enregistrée. » ; si un paiement correspondant existe, `BaseAlert tone="info"` « Une transaction correspondante a été trouvée » + « Voir la suggestion de rapprochement ».
- **États** : chargement (squelette du formulaire) ; 404 « Cette facture n'existe pas ou a été supprimée » + retour à la liste ; erreur réseau à l'enregistrement → saisie conservée, toast d'erreur ; 409 (déjà validée par quelqu'un d'autre) → alerte et rechargement proposé ; accès refusé à l'écriture → formulaire en lecture seule avec « Vous pouvez consulter cette facture mais pas la modifier (rôle Collaborateur). »

#### 3.10 Transactions (liste)
- `DataTable` : Date, Libellé bancaire, Carte (4 derniers chiffres uniquement, jamais de numéro complet), Collaborateur, Entité, Catégorie, Rapprochement (Rapprochée / Suggestion / Non rapprochée), Justificatif, Montant (débit négatif). Filtres comme les factures. Action principale « Importer un CSV ».
- **États** : vide « Aucune transaction » + Importer un CSV ; erreur réseau.

#### 3.11 Import CSV
- **Étapes** : 1. Déposer · 2. Vérifier l'aperçu · 3. Importer.
- **Étape 1** : `FileDropZone accept=".csv" :max-size-mb="5"` ; carte « Format attendu » (colonnes date, libellé, montant, carte, devise ; séparateur `;` ou `,` ; date JJ/MM/AAAA ou AAAA-MM-JJ) + « Télécharger un CSV d'exemple » ; choix de l'entité et de la carte par défaut.
- **Étape 2** : aperçu des 10 premières lignes dans un tableau, correspondance des colonnes (`BaseSelect` par colonne détectée), compte « 48 lignes valides, 2 lignes en erreur » avec la liste des erreurs (« Ligne 12 : montant illisible “12,5O” ») ; doublons détectés signalés `StatusBadge status="duplicate"` et exclus par défaut (case pour les inclure).
- **Étape 3** : bouton « Importer 48 transactions » ; résultat : toast + lien vers les transactions importées + « Lancer les suggestions de rapprochement » (consomme du quota IA : l'indiquer).
- **Erreurs** : fichier invalide (colonnes manquantes, encodage, fichier vide) → alerte danger à l'étape 1 avec le détail ; réseau → saisie conservée, réessayer.
- Pas d'IA nécessaire pour l'import CSV lui-même (le préciser : « Cette étape n'utilise pas l'IA »).

#### 3.12 Rapprochement facture / transaction (validation humaine)
- **Objectif** : confirmer ou refuser les associations proposées. Une suggestion **ne devient définitive qu'après confirmation**.
- **Contenu** : onglets « Suggestions (n) · Non rapprochées · Rapprochées ». Chaque suggestion est une carte en deux colonnes (mobile : empilées) : à gauche la facture (fournisseur, date, montant TTC), à droite la transaction (libellé, date, carte, montant), au centre un lien visuel ; en tête `AiProvenanceBadge provenance="suggested"` + raisons lisibles : « Montant identique · Date à 2 jours d'écart · Fournisseur reconnu dans le libellé ». Écart éventuel mis en évidence (« Écart de 0,40 € »).
- **Actions** : « Confirmer le rapprochement » (principal) · « Ce n'est pas la bonne transaction » (refuser, motif facultatif) · « Rapprocher manuellement » (ouvre un `BaseDialog` de recherche de transaction / facture). Confirmation → la carte passe en « Rapprochée » (`StatusBadge reconciled` + `AiProvenanceBadge validated` « par Alice Martin ») avec un toast « Rapprochement confirmé » et un bouton « Annuler » (5 s).
- **États** : vide « Aucune suggestion en attente » ; IA indisponible / quota → `ErrorState` dans l'onglet Suggestions, l'onglet « Non rapprochées » reste utilisable en manuel ; conflit 409 (déjà rapprochée) → alerte et rafraîchissement. `reconciliations:validate` requis pour confirmer ; sinon lecture seule avec explication.

#### 3.13 Justificatifs manquants
- Liste des transactions sans facture, triée par ancienneté : Date, Libellé, Collaborateur, Carte, Montant, « Manquant depuis 12 jours » (`StatusBadge missing_receipt`).
- **Actions** : « Joindre une facture » (import PDF pré-associé à la transaction) · « Associer une facture existante » · (manager/finance) « Relancer le collaborateur » — hors MVP : en démonstration, le bouton affiche un toast « Relance simulée » ; à valider ou retirer.
- `member` voit uniquement ses propres justificatifs manquants. Vide : « Tous les justificatifs sont présents. »

#### 3.14 Allocations analytiques
- **Objectif** : répartir **une** dépense entre plusieurs imputations sans créer de dépense supplémentaire.
- **Exemple obligatoire** (présent dans la démo) : facture Dell, matériel informatique, **3 000,00 €**, payée par Alice Martin avec une carte de l'entité Belgique.

```
Dépense : Dell Technologies · 11/11/2026 · Payée par Alice Martin (carte Belgique •••• 4821)
Montant à répartir : 3 000,00 €                        [Enregistré 🔒]

  Imputation                 Part        Montant
  Belgique — Informatique    [ 60 ] %    1 800,00 €
  Projet France              [ 40 ] %    1 200,00 €
  [+ Ajouter une imputation]
  ─────────────────────────────────────────────
  Total imputé               100 %       3 000,00 €   ✓ Total conforme
  Reste à imputer              0 %           0,00 €

ⓘ Une seule facture, un seul paiement, plusieurs imputations analytiques.
  L'allocation ne crée aucune dépense supplémentaire ni écriture intersociétés.
  Le total consolidé reste 3 000,00 €.
```

- Saisie en pourcentage **ou** en montant (bascule « Répartir en % / en € ») ; l'autre valeur est calculée (arrondi sans perte de centime : le dernier centime va à la ligne au plus grand reste — règle du module `core/money`).
- Contrôle en direct : total ≠ 100 % → `StatusBadge tone="danger" label="Total incorrect"` + « Reste à imputer : 300,00 € (10 %) » et bouton Enregistrer désactivé avec cette phrase en dessous ; total = 100 % → « Total conforme ».
- Une barre empilée (Belgique pétrole / Projet France orange, séparées par un liseré blanc, libellés directs) visualise la répartition.
- Suggestion IA possible (« Répartition habituelle pour ce fournisseur : 60 / 40 ») affichée avec `AiProvenanceBadge suggested` et un bouton « Appliquer la suggestion » ; jamais appliquée d'office.
- **Liste des allocations** : tableau des dépenses réparties, filtre par entité / projet ; vide « Aucune dépense répartie ».
- **États** : erreur 422 du backend (somme incorrecte) → message sous le total ; accès refusé à l'écriture (`allocations:write`) → lecture seule.
- Hors périmètre : ventilations complexes (multi-niveaux, règles automatiques) — l'écran ne les propose pas.

#### 3.15 Cartes
- Tableau / fiches : carte (•••• 4821, jamais plus), titulaire, entité, plafond mensuel (`ProgressBar` dépenses du mois / plafond), statut (Active / Bloquée), dernière transaction.
- Actions (`cards:manage`) : « Ajouter une carte » (nom, titulaire, entité, 4 derniers chiffres, plafond — **aucun numéro complet ni cryptogramme**, le rappeler dans l'aide du champ), « Bloquer » (confirmation). Vide : « Aucune carte enregistrée ».

#### 3.16 Collaborateurs
- Tableau : nom, e-mail, rôle (libellé `ROLE_LABELS`), entités (badges), nombre de cartes, dépenses du mois.
- Actions (`users:manage`) : inviter (simulé : « Invitation simulée — aucun e-mail n'est envoyé »), modifier rôle et entités, désactiver. Un utilisateur ne peut pas retirer son propre rôle administrateur (message explicite).

#### 3.17 Catégories
- Liste simple (nom, couleur **non** utilisée : les catégories ne reçoivent pas de couleur propre hors graphiques, pour ne pas concurrencer les statuts), nombre de dépenses, total du mois. Actions (`categories:manage`) : ajouter, renommer, archiver (impossible de supprimer une catégorie utilisée : proposer l'archivage).

#### 3.18 Centres de coûts
- Liste : code, nom, type (Département / Projet), entité de rattachement, budget associé. Mêmes actions et règles que les catégories.

#### 3.19 Budgets
- Cartes ou tableau : budget (catégorie / centre de coûts / entité), période, `ProgressBar` (seuil d'alerte 80 % configurable par budget, dépassement hachuré), consommé, restant (« Il reste 3 200,00 € » / « Dépassé de 600,00 € »).
- Actions (`budgets:manage`) : créer, modifier le montant et le seuil. Vue graphique facultative : barres divergentes écart au budget.
- Vide : « Aucun budget défini. Créez un budget pour suivre la consommation. »

#### 3.20 Abonnements et échéances
- Deux onglets : **Abonnements** (fournisseur, montant mensuel, périodicité, entité, prochaine échéance, nombre d'utilisateurs ; badge `AiProvenanceBadge suggested` « Abonnement redondant ? » quand l'IA en détecte) et **Échéances** (calendrier en liste groupée par semaine : « Cette semaine », « Semaine prochaine » ; `StatusBadge due_soon` à moins de 7 jours).
- Les abonnements détectés automatiquement à partir des transactions sont marqués « Suggestion IA » tant qu'ils ne sont pas confirmés.

#### 3.21 Suggestions et analyses IA
- **Contenu** : filtres par type (Anomalie, Doublon potentiel, Hausse de prix, Abonnement redondant, Optimisation) et statut (Ouvertes, Ignorées, Traitées). Chaque suggestion : `AiProvenanceBadge suggested`, titre clair (« Hausse de prix de 18 % chez Figma »), explication en une phrase avec les données utilisées (« 3 dernières factures : 45,00 €, 45,00 €, 54,00 € »), montant concerné, liens vers les éléments sources.
- **Actions** : « Marquer comme traitée », « Ignorer » (motif facultatif), « Ouvrir la facture ». L'IA ne modifie jamais les données d'elle-même.
- Pied de page de l'écran : « Ces analyses sont produites par un service d'IA et peuvent être erronées. Vérifiez avant d'agir. »
- **États** : vide « Aucune suggestion pour cette période » ; IA indisponible / quota → `ErrorState` (les suggestions déjà enregistrées restent consultables, marquées avec leur date).

#### 3.22 Consommation IA : tokens, coûts et quotas
- **Objectif** : rendre visibles le coût et la consommation de l'IA (suivi des coûts, gestion des quotas).
- **Contenu** :
  1. `ProgressBar` principale « Quota de tokens du mois » (valeur / quota du palier lu dans `config/plans.ts`, seuil 80 %), date de renouvellement, palier actuel et lien « Comparer les offres ».
  2. KPI : tokens consommés · coût estimé du mois (mention « Coût estimé, fictif en démonstration ») · nombre d'extractions · coût moyen par facture.
  3. Répartition par fonctionnalité (Extraction de factures, Suggestions de rapprochement, Analyses et anomalies, Assistant — libellés `AI_FEATURE_LABELS`) : barres horizontales + tableau.
  4. Évolution quotidienne (barres, 30 jours).
  5. Journal des appels : date, fonctionnalité, élément concerné (lien), utilisateur, tokens, coût, résultat (Réussi / Échec / Refusé — quota).
- Comportement du palier : si `aiHardLimit`, message « À 100 %, les fonctions IA sont suspendues jusqu'au renouvellement ; la saisie manuelle reste disponible. »
- **Rôles** : `ai-usage:read` (admin, finance — à confirmer). États : vide « Aucune utilisation de l'IA ce mois-ci » ; erreur réseau.

#### 3.23 Paramètres utilisateur
- Sections : Profil (nom, e-mail — lecture seule en démo), Préférences (périmètre par défaut, format des montants fr-BE / fr-FR, page d'accueil), Notifications (simulées), Organisation (admin : nom, entités, palier — lecture seule en démo avec « Modification disponible avec le backend »).

#### 3.24 Confidentialité et suppression des données (authentifié)
- **Contenu** : résumé « Vos données dans CashLens » (catégories de données, finalités, envoi au service d'IA : quoi et quand), lien vers la page publique de transparence ; carte « Exporter mes données » (demande simulée, fichier JSON fictif) ; carte « Supprimer mes données personnelles » ; (admin, `privacy:organization`) carte « Supprimer l'organisation et toutes ses données ».
- **Suppression** : bouton `danger` → `BaseDialog alert` en deux temps : explication de ce qui sera supprimé et de ce qui est conservé (ex. pièces comptables soumises à obligation légale — à confirmer par l'équipe), puis saisie de confirmation (« Tapez SUPPRIMER »). Résultat : écran de confirmation « Vos données ont été supprimées » et déconnexion. En démonstration : « Suppression simulée : les données fictives seront réinitialisées. »
- Aucun dark pattern : le bouton de suppression n'est ni caché ni culpabilisant ; l'annulation est toujours possible avant confirmation.

#### 3.25 Accès refusé (403) et gestion visuelle des permissions
- **Page** : icône bouclier, titre « Accès refusé », texte « Votre rôle (Collaborateur) ne permet pas d'accéder à la page Consommation IA. Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur de votre organisation. » Boutons « Retour au tableau de bord » et (démo) « Changer d'utilisateur de démonstration ». Pas de « Réessayer ».
- **Dans les pages** : actions non autorisées absentes ; sections non autorisées masquées ; champs en lecture seule avec une phrase d'explication en haut du formulaire.
- **Écran « Rôles et accès »** (dans Collaborateurs, onglet) : matrice lisible rôles × domaines (Lire / Modifier / Valider) avec coches et textes, annotée « Matrice provisoire : les droits réels sont vérifiés par le serveur. »
- **Isolation des données** : le périmètre visible est toujours rappelé (« Vous voyez les données de : Belgique ») ; un `manager` d'une entité ne voit pas l'autre entité dans le sélecteur.

#### 3.26 Page introuvable (404) et session expirée
- 404 : « Cette page n'existe pas » + retour au tableau de bord.
- 401 : redirection vers la connexion avec message, puis retour à la page demandée.
