# Matrice PROVISOIRE des exigences connues (partie B)

> La correspondance individuelle entre les numéros O1 à O7 et les exigences **n'est pas connue**
> (cahier des charges §7). Cette matrice liste donc les exigences effectivement connues, sans
> numéro O. Statut au moment des fondations (architecture frontend) — à mettre à jour.

| Exigence connue (cahier des charges) | Fondation en place | Reste à faire (partie B) |
|--------------------------------------|--------------------|--------------------------|
| IA centrale avec données enregistrées | Types `AiInsight`, `InvoiceDraft`, provenance ; services IA mock (extraction simulée, analyses, suggestions de rapprochement) | Écrans analyses IA, import PDF |
| Au moins quatre entités métier reliées | Organisation, entité, utilisateur, carte, facture, ligne, transaction, rapprochement, catégorie, centre de coûts, allocation, budget, abonnement, échéance (`src/domain`) | — |
| Authentification | Session simulée, connexion / inscription provisoires | Écrans définitifs ; vraie auth = partie A |
| Gestion des rôles | 4 rôles simulés, matrice de permissions, garde de route, page « Accès refusé » | Masquage fin des actions dans les écrans |
| Isolation des données | Filtrage simulé par organisation / entités dans les services mock | Isolation réelle = partie A |
| Interface responsive | Layout provisoire avec point de rupture mobile | Design system (agent UI) |
| Suivi des coûts et tokens IA | `AiUsageService`, `summarizeAiUsage`, jeu de consommation déterministe | Écran consommation IA |
| Gestion des quotas IA | Quota par offre (`config/plans.ts`), erreur `AI_QUOTA_EXCEEDED` réelle en mock | Affichage du quota |
| Quatre erreurs simulables | `INVALID_FILE`, `AI_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`, `NETWORK_ERROR` + mode démo + tests | Messages dans chaque écran |
| Landing avec deux paliers | Landing provisoire lisant `config/plans.ts` | Landing définitive |
| RGPD / suppression des données | `PrivacyService` (export, suppression effective en mémoire, réinitialisation) | Écrans confidentialité |
| Transparence IA | `DataProvenance`, `ExtractedField`, `InvoiceDraft.simulated`, page publique réservée | Badges de provenance, page publique |
| Exemple 3 000 € 60 / 40 | Dans le jeu de données + tests (`dataset.spec.ts`, `spend.spec.ts`) | Visualisation dans les écrans |
