---
name: add-mock-endpoint
description: Expose new mocked backend data to the app through the fake HTTP backend (dataset or generator + route + DAO). Use when a feature needs data that no /api endpoint serves yet.
---

# Add a mock endpoint

The app talks to `/api/*` through DAOs; `src/app/mocks/mock-backend.interceptor.ts` answers from `MOCK_ROUTES`. Follow these steps in order.

## 1. Model first

Define or extend the payload types in `src/app/models/<concept>.model.ts` — exactly what a real API would return (explicit units, ISO timestamps, no UI pre-computation).

## 2. Dataset or generator

Create `src/app/mocks/data/<concept>.mock.ts`:

```typescript
// THROWAWAY MOCK — fake backend, removed when a real API exists.
import { type Building } from '#models/building.model';

import { SeededRandom } from '../utils/seeded-random';

/** Reference instant for every generated series — never `Date.now()`. */
export const MOCK_REFERENCE_DATE = '2026-10-31T23:00:00Z';

export function generateBuildings(): Building[] { /* ... */ }
```

- Fixed seed per dataset (`new SeededRandom(42)`), never `Math.random()`.
- Generate lazily and memoize at module level if the dataset is large.
- Document injected anomalies and data-quality defects in a short comment block at the top: what, where, when.

## 3. Route

Register the endpoint in `src/app/mocks/mock-routes.ts`:

```typescript
{ method: 'GET', path: '/buildings/:buildingId', handler: ({ params }) => findBuilding(params['buildingId']) },
```

The handler returns the bare payload — no envelope. For a failure (unknown id, invalid query), throw a `MockProblemError`:

```typescript
throw new MockProblemError({ type: 'not-found', title: 'Building not found', status: 404, detail: buildingId });
```

The interceptor answers with that HTTP status and a Problem Details body.

## 4. DAO

Add the method to `src/app/dao/<resource>.dao.ts` (create the DAO if needed) per `.claude/rules/dao.md` — `Observable<T>`, URL from `API_BASE_URL`, errors left to propagate.

## 5. Verify

`npm run typecheck`, then open the app (`npm start`) and check the network tab: the call returns 200 with the expected shape, and an unknown id returns the expected status with an `application/problem+json` body. Note in your report that the generator and route need unit tests (`test-agent`).
