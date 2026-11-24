# CashLens — Cahier des charges fonctionnel du frontend (partie B)

> Référence commune pour tous les contributeurs de la partie B.
> Source : cahier des charges transmis par le responsable de la partie B le 24 novembre 2026.
> Ce document décrit le périmètre ; il ne constitue pas une validation définitive des contrats API ni des tarifs.

## 1. Objectif du projet

CashLens est une application SaaS de gestion intelligente des dépenses d'entreprise.

Elle centralise les factures, cartes, transactions et budgets, puis utilise l'intelligence artificielle pour organiser et analyser les dépenses.

L'objectif est de comprendre qui dépense quoi, pour quelle entité et dans quel but.

Il s'agit d'un projet scolaire, pas d'un logiciel comptable complet.

## 2. Architecture technique

Stack prévue :

- Frontend : Vue 3.
- Backend : FastAPI.
- Base de données : PostgreSQL.
- Intelligence artificielle : OpenRouter.
- Hébergement : VPS et Coolify.
- Environnements : staging et production.

Le choix du modèle IA et de l'hébergeur reste à valider.

La partie B est uniquement responsable du développement frontend.

## 3. Organisation métier

Une organisation peut posséder plusieurs entités, par exemple Belgique et France.

- Un collaborateur peut appartenir à plusieurs entités.
- Un collaborateur peut posséder plusieurs cartes.
- Chaque carte appartient à une entité.
- Les dépenses peuvent être analysées par collaborateur, carte, département, projet, catégorie et période.

Les principales entités métier sont :

- Organisation.
- Entité.
- Utilisateur / membre.
- Carte de paiement.
- Facture.
- Ligne de facture.
- Transaction.
- Rapprochement.
- Catégorie.
- Centre de coûts.
- Allocation.
- Budget.
- Abonnement.
- Échéance.

## 4. Parcours métier principal

1. Importer une facture PDF textuelle ou des transactions CSV.
2. Extraire les informations avec l'IA.
3. Proposer un rapprochement entre facture et paiement.
4. Permettre une validation humaine.
5. Analyser les coûts et budgets.

L'IA extrait les fournisseurs, lignes, dates, montants et catégories.

Le backend vérifie, calcule et enregistre les informations.

Une suggestion de rapprochement ne devient définitive qu'après confirmation humaine.

## 5. Exemple métier obligatoire

Une facture de matériel informatique de 3 000 € est payée par Alice avec une carte de l'entité belge.

La dépense est répartie comme suit :

- Belgique : 60 %, soit 1 800 €.
- Projet France : 40 %, soit 1 200 €.

Il existe une seule facture, un seul paiement et plusieurs imputations analytiques.

Le total consolidé doit rester exactement de 3 000 €.

L'allocation ne génère aucune dépense supplémentaire ni écriture intersociétés.

Cet exemple doit être présent dans les données de démonstration et couvert par les tests frontend.

## 6. Interfaces frontend à développer

### Partie publique

- Landing page professionnelle.
- Présentation du produit.
- Présentation des fonctionnalités IA.
- Deux paliers d'offre.
- Connexion et inscription.
- Confidentialité et transparence IA.

Les tarifs et quotas commerciaux définitifs ne sont pas encore validés. Les rendre configurables.

### Partie authentifiée

- Dashboard consolidé de l'organisation.
- Dashboard par entité.
- Gestion des factures.
- Import PDF.
- Détail et lignes de facture.
- Correction et validation des données extraites.
- Gestion des transactions.
- Import CSV.
- Rapprochement facture / transaction.
- Gestion des justificatifs manquants.
- Allocations analytiques.
- Gestion des cartes.
- Gestion des collaborateurs.
- Gestion des catégories.
- Gestion des centres de coûts.
- Gestion des budgets.
- Abonnements et échéances.
- Suggestions et analyses IA.
- Consommation des tokens, coûts et quotas IA.
- Paramètres utilisateur.
- Interfaces de confidentialité et suppression des données.
- Gestion visuelle des permissions et accès refusés.

### Tableaux de bord

Prévoir notamment :

- Dépenses totales.
- Dépenses par entité.
- Dépenses par collaborateur.
- Dépenses par carte.
- Dépenses par catégorie.
- Dépenses par département et projet.
- Évolution des coûts.
- Budgets consommés et restants.
- Justificatifs manquants.
- Factures à valider.
- Rapprochements en attente.
- Abonnements et échéances.
- Anomalies et suggestions IA.

Les données doivent être cohérentes entre tous les écrans.

## 7. Exigences scolaires O1 à O7

La documentation de synthèse regroupe les objectifs de la manière suivante :

### O1 à O3

- Intelligence artificielle centrale avec données enregistrées.
- Au moins quatre entités métier reliées.
- Authentification.
- Gestion des rôles.
- Isolation des données.
- Interface responsive.

### O4 à O7

- Suivi des coûts et tokens IA.
- Gestion des quotas IA.
- Quatre erreurs simulables.
- Landing page avec deux paliers.
- Respect du RGPD.
- Transparence concernant l'utilisation de l'IA.
- Suppression des données.

**Attention :** la correspondance individuelle exacte entre chaque numéro O1 à O7 et son exigence n'est pas détaillée dans le document de synthèse.

Ne pas inventer cette correspondance. Maintenir une matrice provisoire des exigences effectivement connues.

## 8. Quatre erreurs simulables

Les scénarios suivants sont proposés pour couvrir cette exigence :

1. Import d'un fichier invalide.
2. Service IA indisponible.
3. Quota IA dépassé.
4. API indisponible ou erreur réseau.

Ces quatre scénarios constituent une proposition technique, pas une liste imposée explicitement par le professeur.

Prévoir une manière simple et reproductible de les déclencher en mode démonstration.

## 9. Transparence IA

L'interface doit distinguer clairement :

- Les informations extraites automatiquement.
- Les suggestions générées par l'IA.
- Les informations corrigées par un utilisateur.
- Les informations validées.
- Les données financières enregistrées.

Les suggestions IA peuvent concerner :

- Les anomalies.
- Les doublons potentiels.
- Les hausses de prix.
- Les abonnements redondants.
- L'optimisation des dépenses.

L'IA assiste l'utilisateur, mais ne remplace pas sa validation.

## 10. Périmètre MVP

À développer :

- Multi-entités.
- Utilisateurs.
- Cartes multiples.
- Import PDF textuel et CSV.
- Extraction et analyse IA.
- Validation humaine.
- Rapprochement simple.
- Catégories.
- Budgets.
- Imputations.
- Tableaux de bord.

Hors périmètre actuel :

- OCR avancé.
- Ventilations complexes.
- Prévisions financières poussées.
- Achats avant paiement.
- Workflows complexes d'approbation.
- Exports avancés.
- Intégrations bancaires et comptables.
- Comptabilité générale.
- Écritures intersociétés.

## 11. Développement sans backend

Les parties A et C ne sont pas disponibles actuellement.

Utiliser une architecture frontend comprenant :

- Modèles TypeScript partagés.
- Interfaces de services.
- Adaptateurs API.
- Services mockés.
- Données fictives déterministes.
- Authentification simulée.
- Rôles simulés.
- Erreurs simulables.
- Configuration mock / API réelle.

Les composants Vue doivent passer par les services, et non accéder directement aux données fictives.

Ne pas développer un backend temporaire concurrent.

Ne pas implémenter de fausse sécurité présentée comme réelle.

Documenter les futurs contrats API sans les considérer comme définitivement validés.

## 12. Contraintes

- Crédit IA fourni au groupe : 1 €.
- Aucun appel OpenRouter réel pendant le développement frontend.
- Aucun véritable document financier.
- Aucune donnée bancaire sensible.
- Aucun secret dans le frontend.
- Code simple et compréhensible pour un projet scolaire.
- Éviter la surarchitecture.
- Préserver la capacité de chaque étudiant à expliquer sa contribution.

## 13. Livrables et dates

- Remise : 3 janvier 2027.
- Présentation orale : 5 janvier 2027.

Livrables :

- Repository GitHub.
- URL de l'application.
- Rapport PDF.
- Carnets individuels.

Maintenir un journal de développement de la partie B avec les décisions, difficultés, fonctionnalités réalisées et preuves de tests.

## 14. Règles de travail

- Ne pas fusionner dans `main` et ne rien déployer en production sans validation collective.
- Coordonner les fichiers partagés ; utiliser des branches ou worktrees pour éviter les conflits.
- Préparer une documentation d'intégration destinée aux responsables A et C.
- Développer et tester progressivement l'ensemble du frontend en mode mock : l'application Vue 3 doit être réellement utilisable et démontrable, pas un plan ni des maquettes statiques.
