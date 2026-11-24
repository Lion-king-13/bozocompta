# Ce que la partie B attend des parties A (backend) et C (infrastructure)

> Statut : provisoire. À relire ensemble avant l'intégration. Contrats d'API détaillés :
> [CONTRATS_API.md](CONTRATS_API.md).

## 1. Partie A — backend FastAPI

### Authentification et sécurité (le frontend ne fait AUCUNE sécurité réelle)

- Le frontend simule session, rôles, permissions et isolation **uniquement pour l'affichage**.
  Le backend doit :
  - authentifier (`POST /auth/login`, `/auth/signup`, `GET /auth/session`, `POST /auth/logout`) ;
  - renvoyer un jeton porteur (`Authorization: Bearer …`) ; durée de vie et renouvellement à définir ;
  - **contrôler chaque requête** : rôle (`admin`, `finance`, `manager`, `member` — provisoires),
    organisation, entités accessibles (règle « entité payeuse OU entité imputée accessible ») ;
  - répondre `401` (session absente / expirée), `403` (droit insuffisant), `404` pour une ressource
    d'une autre organisation.
- Alternative à discuter : cookie de session `HttpOnly` + `SameSite` au lieu du Bearer (le client
  HTTP devra alors utiliser `credentials: 'include'` ; impact CORS ci-dessous).

### Données et calculs

- Montants en **centimes entiers**, pourcentages en **points de base**, EUR uniquement, montants positifs.
- Recalcul côté serveur de tout montant dérivé (totaux de facture, montants d'allocation au plus
  grand reste) : le frontend n'envoie jamais de montant calculé.
- Respect des règles métier de [DECISIONS.md](DECISIONS.md) (dépense = transaction, rapprochement 1 ↔ 1,
  allocation sur la transaction, budgets mensuels sur l'imputé).
- Format d'erreur `{ "error": { "code", "message", "details" } }` avec les codes de CONTRATS_API.md,
  en particulier les quatre erreurs simulables : `INVALID_FILE`, `AI_UNAVAILABLE`,
  `AI_QUOTA_EXCEEDED` (et l'API indisponible, détectée côté client).
- Clés JSON en camelCase (alias Pydantic).

### IA

- Seul le backend appelle OpenRouter ; **aucune clé IA ne transite par le frontend**.
- Le budget IA réel du groupe est de 1 € : prévoir un mode de développement sans appel réel
  (réponses enregistrées) et un plafond de dépense côté serveur.
- Enregistrer la consommation (tokens entrée/sortie, coût) par appel réussi ; refuser avec
  `AI_QUOTA_EXCEEDED` au-delà du quota de l'offre ; ne pas décompter un appel en échec.
- Renvoyer la provenance des champs extraits (`ai_extracted`, `ai_suggested`, …).

### Fichiers

- `POST /invoices/import-pdf` et `POST /transactions/import-csv` en `multipart/form-data` ;
  revérifier type, taille (5 Mo PDF, 1 Mo CSV — provisoire) et contenu côté serveur.
- Stockage du PDF source et URL de consultation (`sourceDocument.url`) protégée par l'authentification.

### RGPD

- Export des données personnelles, suppression du compte / des données de l'organisation,
  délais et journalisation : à implémenter côté serveur (le frontend ne fait que simuler).

## 2. Partie C — infrastructure (VPS, Coolify, staging / production)

### Build du frontend

- Application **statique** : `cd frontend && npm ci && npm run build` → dossier `frontend/dist/`.
- Node.js **22** (`engines.node >= 22`), npm 10.
- Les variables `VITE_*` sont lues **au moment du build** (pas à l'exécution) : un build par
  environnement (staging, production), ou une adaptation à prévoir si C veut une image unique.

### Variables d'environnement (toutes publiques, aucun secret)

| Variable | Staging / production | Rôle |
|----------|---------------------|------|
| `VITE_API_MODE` | `http` (ou `mock` pour une démo sans backend) | choix des services |
| `VITE_API_BASE_URL` | ex. `https://api-staging.<domaine>/api/v1` | URL de l'API |
| `VITE_API_TIMEOUT_MS` | `10000` | délai des requêtes |
| `VITE_MOCK_LATENCY_MS` | `300` | latence simulée (mode mock seulement) |

Ne jamais mettre de clé (OpenRouter, base de données…) dans une variable `VITE_*` : elle serait
visible dans le JavaScript livré.

### Serveur web

- Servir `dist/` avec **repli SPA** : toute URL inconnue (ex. `/app/factures/inv-001`) renvoie
  `index.html` (historique HTML5 de vue-router).
- Cache long pour `dist/assets/*` (noms hachés), pas de cache pour `index.html`.
- HTTPS obligatoire ; en-têtes de sécurité conseillés (CSP compatible avec l'app, `X-Content-Type-Options`, `Referrer-Policy`).

### CORS (si le frontend et l'API ont des domaines différents)

- Autoriser l'origine exacte du frontend par environnement (pas `*` si cookies).
- Méthodes `GET, POST, PUT, DELETE, OPTIONS` ; en-têtes `Authorization, Content-Type`.
- Alternative plus simple : servir l'API sous le même domaine (`/api/v1` derrière le même proxy).

### Environnements

- Staging et production séparés (URL d'API distinctes). Un déploiement `mock` peut servir de
  démonstration publique tant que l'API n'est pas prête.
- CI suggérée : `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
  `npm run e2e` (Playwright + Chromium à installer dans l'image CI : `npx playwright install --with-deps chromium`).
- Aucune mise en production ni fusion dans `main` sans validation collective.
