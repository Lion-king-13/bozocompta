# CashLens — Design system

> Référence visuelle et d'interaction du frontend (partie B).
> Fichiers : `styles/tokens.css`, `styles/base.css`, `components/ui/*`.
> Statut : proposition prête à intégrer ; certains points restent à arbitrer (voir dernière section).

## 1. Principes

1. **Digne de confiance avant d'être spectaculaire.** CashLens manipule de l'argent : interface calme, peu d'ombres, pas de dégradés décoratifs, chiffres alignés, aucune animation gratuite.
2. **L'IA se voit toujours.** Toute donnée porte sa provenance : extraite par l'IA, suggérée par l'IA, corrigée, validée, enregistrée. L'IA propose, l'utilisateur décide.
3. **Jamais la couleur seule.** Chaque état (statut, provenance, seuil de budget, variation) associe couleur + icône + texte. La page reste compréhensible en niveaux de gris.
4. **Chaque écran a ses quatre états.** Chargement (squelette), vide (avec action suivante), erreur (avec « Réessayer »), accès refusé. Un écran sans ces états n'est pas terminé.
5. **Honnêteté du mode démonstration.** Données fictives, authentification simulée, tarifs indicatifs : c'est dit à l'écran, sans faire semblant d'être sécurisé.
6. **Simple à expliquer.** Un composant = un fichier lisible, sans dépendance au store ni aux services (props, événements, slots).

## 2. Identité visuelle

### Palette

| Rôle | Couleur | Usage |
|---|---|---|
| Marque — bleu pétrole 700 | `#0e5670` | Bouton principal, liens, onglet actif |
| Marque — bleu pétrole 900 | `#0a2f3c` | Barre latérale |
| Marque — fond doux | `#eef6f8` | Fond d'icône, survol de bouton fantôme |
| Touche « lentille » ambre | `#e0a526` | Logo et repère de l'élément de navigation actif **uniquement** (jamais du texte) |
| Neutres ardoise | `#141d26` → `#f3f5f7` | Texte, bordures, fonds |

Pourquoi le bleu pétrole : il évoque la banque et la stabilité sans tomber dans le bleu « générique » ni dans le violet des gabarits SaaS. Le violet/indigo est **réservé à l'IA** pour qu'il reste un signal.

### Typographie

- Pile système : `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif`. Aucune police distante (rapide, pas de requête tierce, cohérent avec le RGPD).
- Montants : `font-variant-numeric: tabular-nums` (classe `.tabular-nums`, automatique dans `DataTable` colonnes `numeric`, `KpiCard`, `ProgressBar`).
- Échelle : 12 / 14 / 16 / 18 / 20 / 24 / 30 px + titre de landing fluide (32 → 48 px).
- Texte courant 16 px ; tableaux et libellés 14 px ; 12 px réservé aux mentions et badges compacts.
- Champs de saisie toujours en 16 px (évite le zoom automatique sur iOS).

### Contrastes (WCAG 2.x, calculés par `node tools/contrast.mjs styles/tokens.css`)

| Couple | Texte | Fond | Ratio | Seuil |
|---|---|---|---|---|
| Texte principal / fond de page | `#141d26` | `#f3f5f7` | 15,58:1 | 4,5:1 |
| Texte principal / carte | `#141d26` | `#ffffff` | 17,03:1 | 4,5:1 |
| Texte secondaire / carte | `#4f5b67` | `#ffffff` | 6,94:1 | 4,5:1 |
| Texte secondaire / fond de page | `#4f5b67` | `#f3f5f7` | 6,35:1 | 4,5:1 |
| Texte secondaire / en-tête de tableau | `#4f5b67` | `#e9edf1` | 5,90:1 | 4,5:1 |
| Lien / carte | `#0e5670` | `#ffffff` | 8,13:1 | 4,5:1 |
| Bouton principal | `#ffffff` | `#0e5670` | 8,13:1 | 4,5:1 |
| Bouton principal survolé | `#ffffff` | `#0b4558` | 10,47:1 | 4,5:1 |
| Bouton danger | `#ffffff` | `#b42318` | 6,57:1 | 4,5:1 |
| Texte marque / fond doux | `#0e5670` | `#eef6f8` | 7,42:1 | 4,5:1 |
| Barre latérale : texte | `#ffffff` | `#0a2f3c` | 14,14:1 | 4,5:1 |
| Barre latérale : texte atténué | `#b5ccd4` | `#0a2f3c` | 8,45:1 | 4,5:1 |
| Bordure de champ (non textuel) | `#75818d` | `#ffffff` | 3,98:1 | 3:1 |
| Anneau de focus / carte | `#1d63d6` | `#ffffff` | 5,51:1 | 3:1 |
| Anneau de focus / fond de page | `#1d63d6` | `#f3f5f7` | 5,05:1 | 3:1 |
| Statut succès | `#166139` | `#e5f4eb` | 6,59:1 | 4,5:1 |
| Statut avertissement | `#794700` | `#fdf1d6` | 6,90:1 | 4,5:1 |
| Statut danger | `#a1231b` | `#fcebe9` | 6,57:1 | 4,5:1 |
| Statut information | `#1c4e8f` | `#e8f0fb` | 7,21:1 | 4,5:1 |
| Statut neutre | `#37434f` | `#e9edf1` | 8,59:1 | 4,5:1 |
| Erreur de champ / carte | `#a1231b` | `#ffffff` | 7,58:1 | 4,5:1 |
| IA — extrait | `#3a3f8f` | `#eeeffc` | 8,04:1 | 4,5:1 |
| IA — suggestion | `#3a3f8f` | `#ffffff` | 9,18:1 | 4,5:1 |
| Corrigé | `#84275f` | `#fbecf5` | 7,56:1 | 4,5:1 |
| Validé | `#166139` | `#e5f4eb` | 6,59:1 | 4,5:1 |
| Enregistré | `#ffffff` | `#37434f` | 10,10:1 | 4,5:1 |
| Bordure pointillée de suggestion | `#5b61c6` | `#ffffff` | 5,29:1 | 3:1 |
| Bandeau démonstration | `#6b4300` | `#fff4d6` | 7,89:1 | 4,5:1 |

Tous les couples passent AA (texte normal). `--color-text-disabled` (`#8f9ba7`, 2,9:1) est volontairement réservé aux éléments désactivés, exemptés par WCAG.

## 3. Tokens

Règle : **les composants n'utilisent que les rôles `--color-*`**, jamais `--palette-*` ni une valeur hexadécimale.

| Famille | Variables | Remarques |
|---|---|---|
| Fonds | `--color-bg`, `--color-surface`, `--color-surface-sunken`, `--color-surface-hover`, `--color-overlay` | Page grise claire, cartes blanches |
| Texte | `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-disabled`, `--color-text-link`, `--color-text-inverse`, `--color-text-on-primary` | |
| Bordures | `--color-border-subtle`, `--color-border`, `--color-border-input`, `--color-border-strong` | `-input` ≥ 3:1 |
| Actions | `--color-primary(-hover/-active/-soft/-border)`, `--color-danger(-hover)` | |
| Focus | `--color-focus`, `--focus-outline`, `--focus-offset`, `--focus-ring` | Anneau bleu 2 px, décalé de 2 px |
| Tons | `--color-{neutral,info,success,warning,danger}-{text,bg,border,solid}` | Badges, alertes, toasts |
| IA | `--color-ai-{extracted,suggested,corrected,validated,recorded}-{text,bg,border}`, `--color-field-{extracted,corrected}-bg` | Voir § 4 |
| Graphiques | `--chart-cat-1…8`, `--chart-other`, `--chart-seq-1…7`, `--chart-div-*`, `--chart-grid`, `--chart-axis` | Voir § 5 |
| Typo | `--font-sans`, `--font-mono`, `--font-size-{xs…3xl,display}`, `--font-weight-*`, `--line-height-*` | |
| Espacements | `--space-{0,1,2,3,4,5,6,8,10,12,16}` (grille 4 px) | |
| Mise en page | `--page-gutter` (16/24/32 px selon l'écran), `--page-max-width`, `--sidebar-width`, `--topbar-height`, `--control-height(-sm)`, `--touch-target` | |
| Rayons | `--radius-{sm,md,lg,xl,full}` (4/6/10/16 px) | |
| Ombres | `--shadow-{xs,sm,md,lg}` | Très discrètes |
| Mouvement | `--duration-{fast,normal,slow}`, `--easing-standard` | Ramenés à 0 si `prefers-reduced-motion` |
| Couches | `--z-{sticky,sidebar,dropdown,overlay,modal,toast}` | |

**Thème sombre** : non fourni. La structure (rôles sémantiques) le permet plus tard en redéfinissant les `--color-*` sous `@media (prefers-color-scheme: dark)`, mais cela double les vérifications de contraste et de graphiques ; à ne faire que si l'équipe le juge utile (point d'arbitrage).

## 4. Transparence IA (§9 du cahier des charges)

Cinq états, chacun distingué par **quatre** indices : couleur, icône, texte, forme.

| État | Libellé affiché | Icône | Forme | Sens |
|---|---|---|---|---|
| `suggested` | Suggestion IA | ampoule | fond blanc, **bordure pointillée** indigo | Proposition ; ne s'applique qu'après confirmation |
| `extracted` | Extrait par l'IA | étincelle | fond indigo doux | Lu automatiquement dans un document ; à vérifier |
| `corrected` | Corrigé | crayon | fond prune doux | Modifié par un utilisateur après extraction |
| `validated` | Validé | coche | fond vert doux | Confirmé par un utilisateur |
| `recorded` | Enregistré | cadenas | **fond ardoise plein**, texte blanc | Donnée financière enregistrée, référence des calculs |

- Les badges de provenance ont des **angles vifs** (4 px) ; les badges de statut métier sont **en pilule**. On ne les confond donc pas même en niveaux de gris.
- Le texte d'explication de chaque état (`AI_PROVENANCE[...].description`) est lu par les lecteurs d'écran et affiché au survol.
- Dans un formulaire de correction, le champ prend un fond teinté (`tint="extracted"` / `"corrected"`) **et** porte le badge dans son libellé.
- Cycle normal d'une valeur : `extracted` → (`corrected`) → `validated` → `recorded`. Une suggestion (`suggested`) devient `validated` si l'utilisateur l'accepte, disparaît sinon.
- Sur un écran dense, prévoir une légende (boucle sur `AI_PROVENANCE_ORDER`).

### Statuts métier (`BUSINESS_STATUS`)

| Clé | Libellé | Ton |
|---|---|---|
| `to_validate` | À valider | avertissement |
| `pending` | En attente | neutre |
| `draft` | Brouillon | neutre |
| `validated` | Validée | succès |
| `paid` | Payée | succès |
| `reconciled` | Rapprochée | succès |
| `not_reconciled` | Non rapprochée | neutre |
| `missing_receipt` | Justificatif manquant | danger |
| `disputed` | Contestée | danger |
| `rejected` / `cancelled` | Rejetée / Annulée | neutre |
| `budget_ok` / `budget_near` / `budget_exceeded` | Dans le budget / Budget bientôt atteint / Budget dépassé | succès / avertissement / danger |
| `duplicate` | Doublon potentiel | avertissement |
| `anomaly` | Anomalie | danger |
| `due_soon` | Échéance proche | avertissement |
| `active` / `inactive` / `blocked` | Actif / Inactif / Bloquée | succès / neutre / danger |

Les libellés sont au féminin quand ils qualifient une facture ou une transaction. Pour un autre genre, passer `tone` + `label` explicitement. La correspondance avec les statuts du domaine (ex. `InvoiceStatus` : `to_review` → `to_validate`) se fait dans l'écran, pas dans le composant.

## 5. Graphiques

### Catégorielle (ordre fixe)

| Slot | Teinte | Hex | Contraste sur blanc |
|---|---|---|---|
| 1 | pétrole | `#1a7fa3` | 4,56:1 |
| 2 | orange | `#e0702b` | 3,22:1 |
| 3 | vert d'eau | `#1f9b70` | 3,51:1 |
| 4 | ocre | `#b98000` | 3,41:1 |
| 5 | magenta | `#c75f93` | 3,83:1 |
| 6 | vert | `#4a8a2a` | 4,23:1 |
| 7 | indigo | `#5b5fc7` | 5,38:1 |
| 8 | rouge | `#d94a45` | 4,19:1 |
| — | Autres | `#8f9ba7` | |

Validé avec un script de contrôle de palette (bande de luminosité, chroma, séparation daltonisme, contraste) : **toutes les vérifications passent** pour les paires adjacentes (barres, lignes, empilements) — pire écart daltonisme ΔE 8,3 (protanopie, vert d'eau/orange), pire écart vision normale ΔE 17,8, les 8 teintes ≥ 3:1 sur blanc.

Règles :
- Couleurs attribuées **dans l'ordre**, jamais recyclées ; au-delà de 8 séries → « Autres ».
- La couleur suit l'entité, pas son rang : Belgique = slot 1, France = slot 2 sur **tous** les écrans (cohérence exigée au §6).
- Nuages de points / graphiques où toutes les séries se côtoient : **2 séries maximum** (au-delà, les paires non adjacentes ne passent plus les seuils) ; sinon petits multiples.
- Toujours une légende dès 2 séries, des libellés directs si ≤ 4, et une vue tableau accessible.
- Le texte (valeurs, légendes) reste en `--color-text` / `--color-text-secondary`, jamais dans la couleur de la série.
- Les couleurs de statut (succès/avertissement/danger) ne servent jamais de « série 4 ».
- Un seul axe des ordonnées (pas de double axe).

### Séquentielle (une teinte)

`--chart-seq-1` `#e3f0f4` → `--chart-seq-7` `#0f4d66`. Pour des marques discrètes ordonnées, commencer à `--chart-seq-3` (les deux premiers paliers sont trop proches du blanc).

### Divergente (écart au budget)

Sous le budget `--chart-div-negative` (pétrole) ← `--chart-div-neutral` (gris) → au-dessus `--chart-div-positive` (rouge).

## 6. Composants

Tous dans `components/ui/`, importables via `import { BaseButton } from '@/components/ui'`.
Aucun n'accède au store, au routeur ni aux services. Les montants arrivent **déjà formatés** (`formatCents` du module `core/money`).

### BaseButton
- Props : `variant` (`primary` | `secondary` | `ghost` | `danger`, défaut `primary`), `size` (`md` | `sm`), `type` (`button` par défaut), `disabled`, `loading`, `icon` (nom d'icône), `block`, `href` (rend un `<a>`).
- Emits : `click`. Slot : libellé.
- Règle : un seul bouton `primary` par zone ; les actions destructrices en `danger`, toujours confirmées.
```vue
<BaseButton icon="check" :loading="saving" @click="validate">Valider et enregistrer</BaseButton>
```

### BaseTextField
- v-model : `string`. Props : `label` (obligatoire), `type`, `inputmode` (`decimal` pour les montants), `placeholder`, `hint`, `error`, `required`, `disabled`, `readonly`, `autocomplete`, `suffix` (`€`, `%`), `tint` (`extracted` | `corrected`).
- Slot : `label-extra` (badge de provenance à droite du libellé).
- Le message d'erreur est relié par `aria-describedby` et le champ passe `aria-invalid`.
```vue
<BaseTextField v-model="form.total" label="Montant TTC" inputmode="decimal" suffix="€" required
  :error="errors.total" tint="extracted">
  <template #label-extra><AiProvenanceBadge provenance="extracted" size="sm" /></template>
</BaseTextField>
```

### BaseSelect
- v-model : `string`. Props : `label`, `options: SelectOption[]` (`{ value, label, disabled? }`), `placeholder`, `hint`, `error`, `required`, `disabled`, `hideLabel`.
- `<select>` natif : accessible et adapté au mobile sans code supplémentaire.
```vue
<BaseSelect v-model="entityId" label="Entité" :options="entityOptions" placeholder="Choisir une entité" />
```

### BaseCheckbox
- v-model : `boolean`. Props : `label`, `description`, `error`, `disabled`, `required`.
```vue
<BaseCheckbox v-model="confirmed" label="J'ai vérifié les montants extraits" />
```

### BaseCard
- Props : `title`, `description`, `headingLevel` (2 | 3 | 4), `flush` (sans padding, pour un tableau), `as`.
- Slots : défaut, `header` (remplace titre + description), `actions`, `footer`.
```vue
<BaseCard title="Budgets" description="Consommation du mois en cours">
  <template #actions><BaseButton size="sm" variant="ghost">Tout voir</BaseButton></template>
  …
</BaseCard>
```

### StatusBadge
- Props : `status` (clé de `BUSINESS_STATUS`) **ou** `tone` + `label` (+ `icon`) ; `size` (`md` | `sm`).
```vue
<StatusBadge status="missing_receipt" />
<StatusBadge tone="warning" label="3 jours de retard" icon="clock" />
```

### AiProvenanceBadge
- Props : `provenance` (`extracted` | `suggested` | `corrected` | `validated` | `recorded`), `detail` (ex. « par Alice Martin »), `size`.
```vue
<AiProvenanceBadge provenance="corrected" detail="par Alice Martin" />
```

### DataTable (générique)
- Props : `columns: DataTableColumn[]` (`key`, `label`, `numeric?`, `sortable?`, `hideOnMobile?`, `width?`), `rows: T[]`, `rowKey`, `caption` (obligatoire, lue par les lecteurs d'écran), `showCaption`, `sortKey`, `sortDirection`.
- Emits : `sort(key, direction)` — le tri est fait par la page ou le service.
- Slots : `cell-<key>` (scopé : `{ row, value }`), `empty`.
- Responsive selon la **largeur disponible** (container queries) : tableau complet ; colonnes `hideOnMobile` retirées sous 896 px ; sous 640 px, chaque ligne devient une fiche « libellé : valeur » (la première colonne sert de titre). Filet de sécurité : défilement horizontal focusable.
```vue
<DataTable :columns="columns" :rows="invoices" row-key="id" caption="Factures"
  :sort-key="sort.key" :sort-direction="sort.direction" @sort="onSort">
  <template #cell-status="{ row }"><StatusBadge :status="toUiStatus(row.status)" size="sm" /></template>
  <template #cell-total="{ row }">{{ formatCents(row.totalCents) }}</template>
  <template #empty><EmptyState compact title="Aucune facture" /></template>
</DataTable>
```

### BaseDialog
- v-model : `open`. Props : `title`, `description`, `size` (`sm` | `md` | `lg`), `alert` (`role="alertdialog"`, pas de fermeture au clic extérieur), `persistent` (non fermable, ex. pendant un enregistrement).
- Emits : `close`. Slots : défaut, `footer`.
- Accessibilité : `aria-modal`, titre relié, focus placé dans la modale à l'ouverture, Tab/Maj+Tab piégés, Échap ferme, focus rendu au déclencheur, défilement de la page bloqué. Sur mobile, la modale monte depuis le bas et les boutons passent en pleine largeur (action principale en haut).
```vue
<BaseDialog v-model:open="confirmOpen" title="Supprimer mes données ?" alert size="sm">
  Cette action est définitive.
  <template #footer>
    <BaseButton variant="secondary" @click="confirmOpen = false">Annuler</BaseButton>
    <BaseButton variant="danger" @click="deleteData">Supprimer définitivement</BaseButton>
  </template>
</BaseDialog>
```

### BaseAlert (bannière)
- Props : `tone` (défaut `info`), `title`, `dismissible`, `live` (annonce l'apparition : `role="alert"` pour danger/avertissement, `role="status"` sinon).
- Emits : `dismiss`. Slots : défaut, `actions`.
```vue
<BaseAlert tone="danger" title="Service IA indisponible" live>
  L'extraction automatique est momentanément impossible. Vous pouvez saisir la facture manuellement.
  <template #actions><BaseButton size="sm" variant="secondary" @click="retry">Réessayer</BaseButton></template>
</BaseAlert>
```

### ToastRegion
- Props : `toasts: ToastItem[]` (`id`, `tone`, `title`, `message?`, `duration?` en ms, 0 = permanent, défaut 6 000).
- Emits : `dismiss(id)` (fermeture manuelle ou expiration).
- Sans état propre : la liste est tenue par la couche applicative (composable `useToasts` à créer côté architecture). Une seule instance dans `App.vue`. Deux régions live : polie (confirmations), assertive (erreurs).
```vue
<ToastRegion :toasts="toasts" @dismiss="removeToast" />
```

### EmptyState
- Props : `title`, `description`, `icon` (défaut `inbox`), `compact`. Slot : `actions`.
```vue
<EmptyState icon="receipt" title="Aucune facture pour l'instant"
  description="Importez une facture PDF pour que l'IA en extraie les informations.">
  <template #actions><BaseButton icon="upload">Importer une facture</BaseButton></template>
</EmptyState>
```

### LoadingSkeleton
- Props : `variant` (`text` | `table` | `kpi` | `card`), `rows`, `count`, `label` (annoncé, défaut « Chargement en cours… »).
- Animation coupée si `prefers-reduced-motion`.
```vue
<LoadingSkeleton v-if="loading" variant="table" :rows="8" label="Chargement des transactions" />
```

### ErrorState
- Props : `title`, `message`, `code` (code technique discret), `icon`, `retryLabel`, `hideRetry`, `retrying`, `compact`.
- Emits : `retry`. Slot : `actions` (ex. « Saisir manuellement »).
```vue
<ErrorState title="Impossible de charger les factures" code="NETWORK_ERROR" :retrying="loading" @retry="load" />
```

### KpiCard
- Props : `label`, `value` (chaîne déjà formatée), `variation` (en %), `variationLabel`, `trend` (`up-is-bad` par défaut pour une dépense | `up-is-good` | `neutral`), `hint`, `icon`. Slot défaut = `hint` enrichi.
- La variation est écrite en toutes lettres (« En hausse de 12,4 % »).
```vue
<KpiCard label="Dépenses du mois" :value="formatCents(totalCents)" :variation="12.4" variation-label="vs octobre" icon="wallet" />
```

### ProgressBar
- Props : `label`, `value`, `max` (même unité), `valueText` (« 1 800 € sur 5 000 € »), `warningAt` (défaut 80 %), `dangerAt` (défaut 100 %), `hideLabel`.
- `role="progressbar"` avec `aria-valuetext` complet. États écrits : « Dans la limite », « Seuil d'alerte atteint », « Limite atteinte », « Dépassé » ; dépassement = rouge **hachuré**.
```vue
<ProgressBar label="Quota IA du mois" :value="usage.used" :max="usage.limit" :value-text="`${usage.used} extractions sur ${usage.limit}`" />
```

### FileDropZone
- Props : `label`, `accept` (`.pdf`, `.csv`), `maxSizeMb` (défaut 10), `multiple`, `hint`, `disabled`, `error`.
- Emits : `select(files)`, `reject(rejected: RejectedFile[])` (motif `type` | `size` + message français).
- Glisser-déposer **et** vrai `<input type="file">` focusable (clavier). N'envoie rien lui-même.
```vue
<FileDropZone label="Déposez vos transactions CSV" accept=".csv" hint="Export CSV de votre banque, 5 Mo maximum."
  :max-size-mb="5" :error="importError" @select="importCsv" @reject="onReject" />
```

### BasePagination
- v-model : `page` (obligatoire). Props : `pageCount`, `total`, `itemLabel`.
- Desktop : numéros avec ellipses ; mobile : « Page 3 sur 12 » + précédent/suivant. `aria-current="page"`.
```vue
<BasePagination v-model:page="query.page" :page-count="result.pageCount" :total="result.total" item-label="factures" />
```

### BaseTabs
- v-model : identifiant de l'onglet actif. Props : `tabs: TabItem[]` (`id`, `label`, `count?`, `disabled?`), `label`.
- Slots : `panel-<id>`. Clavier : ← → Début Fin. Les onglets défilent horizontalement sur mobile.
```vue
<BaseTabs v-model="tab" label="Détail de la facture"
  :tabs="[{ id: 'lines', label: 'Lignes', count: 3 }, { id: 'allocations', label: 'Imputations' }]">
  <template #panel-lines>…</template>
  <template #panel-allocations>…</template>
</BaseTabs>
```

### PageHeader
- Props : `title` (le seul `<h1>` de la page), `description`. Slots : `breadcrumb`, `meta` (badges à côté du titre), `actions`.
```vue
<PageHeader title="Facture F-2026-0142" description="Dell Technologies · 11/11/2026">
  <template #meta><StatusBadge status="to_validate" /></template>
  <template #actions><BaseButton icon="check">Valider</BaseButton></template>
</PageHeader>
```

### BaseIcon
- Props : `name` (`IconName`, ~50 icônes maison dans `icons.ts`), `size` (défaut 20), `label` (rend l'icône parlante ; sinon décorative et masquée).

### Fichiers de support
- `types.ts` : `Tone`, `AiProvenance`, `SelectOption`, `DataTableColumn`, `SortDirection`, `TabItem`, `ToastItem`, `RejectedFile`.
- `catalog.ts` : `AI_PROVENANCE`, `AI_PROVENANCE_ORDER`, `BUSINESS_STATUS`, `TONE_ICON`.
- `icons.ts` : tracés SVG, type `IconName`.
- `index.ts` : exports.

## 7. Responsive

| Palier | Largeur | Mise en page |
|---|---|---|
| Mobile | 360 – 767 px | Une colonne ; gouttière 16 px ; barre supérieure (logo, sélecteur d'entité compact, menu) + navigation en tiroir ; tableaux en fiches ; modales en feuille montant du bas ; boutons d'action de formulaire en pleine largeur |
| Tablette | 768 – 1023 px | Grilles 2 colonnes (KPI, formulaires) ; gouttière 24 px ; tableaux complets sans colonnes secondaires ; navigation toujours en tiroir |
| Desktop | ≥ 1024 px | Barre latérale fixe (248 px) ; gouttière 32 px ; KPI en 4 colonnes ; contenu limité à 1 280 px |

Règles :
- Écrire le CSS **mobile d'abord** (`min-width`). Les variables ne fonctionnent pas dans `@media` : utiliser 480 / 768 / 1024 / 1280 px.
- Aucun défilement horizontal de la page à 360 px (vérifié à 360, 375, 768, 1024, 1280, 1440 px sur la page de démonstration).
- Cibles tactiles ≥ 44 px sur écran tactile (`--touch-target`).
- Grilles de cartes : classe `.grid-auto` (`--grid-min` pour la largeur mini d'une carte).

## 8. Accessibilité

- Langue : `<html lang="fr">`. Un seul `<h1>` par page (dans `PageHeader`), niveaux de titres sans saut.
- Lien d'évitement `.skip-link` « Aller au contenu » en tête de la coque applicative.
- Focus visible partout (`:focus-visible`, anneau bleu 2 px ≥ 3:1) ; ne jamais supprimer l'outline sans le remplacer.
- Tout champ a un `<label>` ; erreurs reliées par `aria-describedby` + `aria-invalid` ; au submit, focus sur le premier champ en erreur et résumé `BaseAlert` en haut du formulaire si plusieurs erreurs.
- Statuts, provenances, seuils et variations : couleur + icône + texte.
- Icônes décoratives `aria-hidden` ; boutons icône seule avec `aria-label`.
- Annonces : `BaseAlert live`, `ToastRegion`, `LoadingSkeleton` et `ErrorState` utilisent des régions live adaptées.
- Clavier : modales (piège + Échap + retour du focus), onglets (flèches), tri des colonnes (boutons), zone de dépôt (input focusable), pagination (boutons).
- `prefers-reduced-motion` : durées à 0, squelettes figés, spinner limité à une itération.
- Tableaux : `<caption>` obligatoire, `scope="col"`, `aria-sort` ; rôles ARIA explicites conservés en vue fiches.

## 9. Formatage

| Donnée | Règle | Exemple |
|---|---|---|
| Montant | `formatCents(cents, 'EUR', 'fr-BE')` (module `core/money`) ; jamais de calcul en flottant | `3 000,00 €` |
| Montant négatif (avoir, débit) | signe moins devant | `-186,40 €` |
| Pourcentage | `formatBasisPoints` ; espace insécable avant `%` | `60 %` |
| Date | `formatIsoDate` → JJ/MM/AAAA | `11/11/2026` |
| Date longue (titres, échéances) | `Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' })` | `11 novembre 2026` |
| Période | mois en toutes lettres | `Novembre 2026` |
| Nombre de tokens | séparateur de milliers | `12 480 tokens` |
| Coût IA | 4 décimales maximum si < 0,01 € | `0,0042 €` |

- Locale par défaut `fr-BE` ; `fr-FR` donne le même rendu pour ces formats (seul le séparateur de milliers peut différer selon le navigateur : espace fine insécable).
- Montants alignés à droite dans les tableaux, en chiffres tabulaires.
- Ne jamais afficher un montant arrondi sans le dire (« ≈ ») ; un total de répartition affiche toujours les centimes.

## 10. Ton rédactionnel

- Français, **vouvoiement**, phrases courtes, verbes d'action sur les boutons (« Valider la facture », pas « OK »).
- Dire ce qui se passe et quoi faire : « Le fichier n'est pas un PDF. Choisissez un fichier .pdf de 10 Mo maximum. »
- Ne pas culpabiliser (« Le fichier n'a pas pu être lu », pas « Vous avez envoyé un mauvais fichier »).
- Rassurer sur les données : « Vos données ne sont pas perdues. »
- Parler de l'IA honnêtement : « L'IA propose », « à vérifier », jamais « l'IA a validé ». Pas de nom de modèle ou de fournisseur dans l'interface.
- Mode démonstration toujours explicite : « Connexion simulée », « Données fictives », « Tarifs indicatifs ».
- Typographie française : espace insécable avant `: ; ! ? %` et à l'intérieur des guillemets `« … »` ; apostrophe typographique `’` dans les textes longs ; majuscule seulement au premier mot des libellés (« Rapprochements en attente »).
- Vocabulaire unifié : facture, transaction, rapprochement, justificatif, imputation (analytique), entité, collaborateur, centre de coûts, échéance, abonnement.

## 11. Points ouverts

- Thème sombre : non fourni (voir § 3).
- Correspondance statuts domaine ↔ `BUSINESS_STATUS` à fixer avec l'équipe Architecture.
- Libellé « Corrigé » vs « Corrigé par un utilisateur » : le badge court est utilisé, la description complète est lue/affichée au survol.
