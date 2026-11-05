---
paths:
  - 'src/app/models/**/*.ts'
  - 'src/app/utils/**/*.ts'
---

# Models & utils rules

## `models/`

- One file per domain concept: `building.model.ts`, `equipment.model.ts`, `measurement.model.ts`.
- Contains only: `interface` / `type`, `const` value lists, and pure functions on those types (factories, type guards, readers).
- No `enum` (`erasableSyntaxOnly`) — use a `const` tuple + derived union:
  ```typescript
  export const EQUIPMENT_TYPES = ['energy', 'occupancy', 'temperature', 'hvac'] as const;
  export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
  ```
- Prefer `readonly` properties and `readonly T[]` for data received from the backend.
- Units are explicit in property names when ambiguous: `consumptionWh`, `temperatureCelsius`, `surfaceM2`.
- Timestamps are ISO-8601 strings in payloads; conversion happens in services/utils.

## `utils/`

- Pure functions, named `<topic>.utils.ts`: same input → same output, no DI, no module-level mutable state.
- Fully typed parameters and return; total over their input domain (handle empty arrays, missing values).
- Every exported util has a unit test — they are the cheapest code to protect.
