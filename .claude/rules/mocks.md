---
paths:
  - 'src/app/mocks/**/*.ts'
---

# Mock backend rules

`src/app/mocks/` is a **fake backend**, plugged as an HTTP interceptor. The rest of the app does not know it exists: DAOs call `/api/*` as they would a real server.

## Structure

| File                           | Role                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `mock-backend.interceptor.ts`  | Matches `/api/*` requests against the route table; 200 + bare payload, or `HttpErrorResponse` + Problem Details |
| `mock-routes.ts`               | Route table: `{ method, path, handler }` — the only file wiring endpoints |
| `data/<concept>.mock.ts`       | Datasets and generators for one concept                               |
| `utils/seeded-random.ts`       | Deterministic PRNG — every generator draws from it                    |

## Rules

- First line of every file: `// THROWAWAY MOCK — fake backend, removed when a real API exists.`
- **Deterministic**: a fixed seed per dataset; no `Math.random()`, no `Date.now()` — anchor time series on a constant reference date. The same data must appear at every reload, in tests and in the demo.
- **Realistic**: plausible orders of magnitude, daily/weekly rhythms, and deliberately injected anomalies and data-quality defects (gaps, flat-lined sensors) documented in the dataset file.
- Mocks import types from `#models/*` only — never from components or services.
- Payloads have exactly the shape a real API would return; no UI-specific pre-computation.
- Handlers return the **bare payload**. To simulate a failure, `throw new MockProblemError({ type, title, status, detail })` — the interceptor turns it into an `HttpErrorResponse` with that status and an `application/problem+json` body.
- Unknown `/api/*` route → `404` problem `not-found`, so a missing mock fails loudly.
- An interceptor must **throw** errors (`throwError(() => new HttpErrorResponse(...))`): returning an `HttpResponse` with a 4xx/5xx status is delivered to subscribers as a success.
