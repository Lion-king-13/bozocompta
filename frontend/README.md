# CashLens — frontend (partie B)

Application Vue 3 + TypeScript + Vite. Fonctionne **sans backend** grâce aux services mock
(données fictives déterministes). Architecture : [`docs/partie-b/ARCHITECTURE.md`](../docs/partie-b/ARCHITECTURE.md).

## Prérequis

- Node.js 22 et npm 10.
- Pour les tests e2e sur une machine personnelle : `npx playwright install chromium` (une fois).
  Dans l'environnement de l'école, Chromium est déjà présent dans `/opt/pw-browsers` et utilisé
  automatiquement.

## Lancer en local

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Connexion de démonstration : choisir un compte sur la page de connexion (ex.
`alice.admin@cashlens-demo.test`), mot de passe `demo`. Tout est fictif et simulé.

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | serveur de développement |
| `npm run build` | vérification des types + build de production dans `dist/` |
| `npm run preview` | sert le build (`http://localhost:4173`) |
| `npm run typecheck` | vérification TypeScript (`vue-tsc --build`) |
| `npm run lint` | ESLint (0 avertissement toléré) |
| `npm run format` | Prettier |
| `npm run test` | tests unitaires Vitest |
| `npm run e2e` | tests Playwright (build `--mode e2e` puis `vite preview`), sans trace |

## Configuration

Copier `.env.example` en `.env.local` :

| Variable | Défaut | Rôle |
|----------|--------|------|
| `VITE_API_MODE` | `mock` | `mock` (en mémoire) ou `http` (API FastAPI) |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | URL de l'API en mode `http` |
| `VITE_API_TIMEOUT_MS` | `10000` | délai des requêtes HTTP |
| `VITE_MOCK_LATENCY_MS` | `300` | latence simulée en mode mock (0 en test) |

Ces variables sont publiques (incluses dans le bundle) : n'y mettez jamais de secret.

## Mode démo

- Bouton **« Mode démo »** en haut de l'application : déclenche les erreurs simulées
  (fichier invalide, IA indisponible, quota IA dépassé, API indisponible, 401, 403…).
- Ou par l'URL : `/app?demoError=network`, `/app?demoError=off` pour arrêter.
- Fichiers d'exemple fictifs : `public/demo/` (servis sur `/demo/…`) — `transactions-valide.csv`,
  `transactions-invalide.csv`, `facture-demo.pdf`, `faux-pdf.pdf`.
- « Aujourd'hui » vaut le **20 novembre 2026** dans toute la démo (`src/config/demo.ts`).
- Les modifications (imports, suppressions…) restent en mémoire : un rechargement de la page
  restaure les données initiales.
