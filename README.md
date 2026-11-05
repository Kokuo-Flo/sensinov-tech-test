# Smart Building

Mini-application Angular 22 réalisée pour une étude de cas *Product Engineer* (plateforme SaaS + IoT pour le bâtiment tertiaire, objectif −30 % d'émissions liées à l'énergie).

- **Point de départ** : une reproduction volontairement limitée de l'expérience actuelle du client — une page par équipement, données brutes, aucune priorisation ni action possible — alimentée par un jeu de données en mémoire, déterministe.
- **Ensuite** : évolutions successives vers l'expérience proposée, sur le même jeu de données, pour comparer avant / après en démo.

## Stack

Angular 22 (standalone, zoneless, signals) · Angular Material 22 (thème Material 3 clair / sombre) · Chart.js · TypeScript strict · Vitest · ESLint.

## Démarrer

```bash
npm install
npm start            # http://localhost:4200
```

Prérequis : Node 22+. Il n'y a pas de backend : les données viennent d'un jeu en mémoire (`src/app/data/`), lu par les DAO. Aucun serveur à lancer.

## Commandes

| Commande                 | Rôle                                         |
| ------------------------ | -------------------------------------------- |
| `npm start`              | Serveur de dev                               |
| `npm run typecheck`      | Vérification de types (code + templates)    |
| `npm run typecheck:spec` | Vérification de types des tests             |
| `npm run lint`           | ESLint (`lint:fix` pour corriger)            |
| `npm run validate`       | Lint + typecheck                             |
| `npm test`               | Tests unitaires (Vitest)                     |
| `npm run test:coverage`  | Tests + couverture                           |
| `npm run build`          | Build de production                          |
| `npm run check`          | Tout : lint (0 warning), types, tests, build (0 warning) — « prêt pour review » |

## Organisation

Architecture par type (`components/`, `services/`, `dao/`, `models/`, `pipes/`, `utils/`, `data/`) — détail et conventions dans [docs/STANDARD.md](docs/STANDARD.md).

Travail assisté par IA : voir [CLAUDE.md](CLAUDE.md) (orchestration, agents `code-agent` / `test-agent`, règles par type de fichier, skills).
