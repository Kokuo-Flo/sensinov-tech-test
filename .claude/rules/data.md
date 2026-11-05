---
paths:
  - 'src/app/data/**/*.ts'
---

# Dataset rules

`src/app/data/` is the app's **only data source**: an in-memory, deterministic dataset (reference tables + measurement generator). There is no backend and there will not be one. Only DAOs import from `#data/*`; services and components never do.

## Structure

| Path                           | Role                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `<concept>.data.ts`            | Static datasets and lookups for one concept (`BUILDINGS`, `findBuilding`) |
| `measurement/`                 | Measurement generator, one file per simulated behavior, public entry point |
| `anomalies.data.ts`            | Ground truth of injected wastes and data-quality defects (`INJECTED_ANOMALIES`) |
| `utils/seeded-random.ts`       | Deterministic PRNG — every generator draws from it                       |

## Rules

- **Deterministic**: a fixed seed per dataset; no `Math.random()`, no `Date.now()` — anchor time series on a constant reference instant. The same data must appear at every reload, in tests and in the demo.
- **Draw order matters**: changing the order of PRNG draws changes every generated value. A refactor of the generator must prove identical output (hash all series before / after).
- **Realistic**: plausible orders of magnitude, daily/weekly rhythms, and deliberately injected anomalies and data-quality defects, documented next to the data.
- **Readable**: each generator function says in one doc comment which physical behavior it simulates; named constants instead of magic numbers.
- Types live in `#models/*` (including anomaly types); a data file only declares private, file-local helper types.
- Datasets hold domain data, never UI-specific pre-computation (labels, French copy, colors).
- No anomaly is exposed to the app: detections must find them from the measurements; tests use `INJECTED_ANOMALIES` as the expected answer.
