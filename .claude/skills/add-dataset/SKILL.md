---
name: add-dataset
description: Expose new data to the app through the in-memory dataset (model + dataset or generator + DAO method). Use when a feature needs data that no DAO serves yet.
---

# Add a dataset

The app reads its data through DAOs (`src/app/dao/`), which look it up in the in-memory dataset (`src/app/data/`). There is no backend. Follow these steps in order.

## 1. Model first

Define or extend the types in `src/app/models/<concept>.model.ts` — domain data only (explicit units, ISO timestamps, no UI pre-computation).

## 2. Dataset or generator

Create `src/app/data/<concept>.data.ts` (or a folder for a generator split by behavior):

```typescript
import { type Contact } from '#models/contact.model';

export const CONTACTS: readonly Contact[] = [ /* ... */ ];

export function findContact(contactId: string): Contact | null {
  return CONTACTS.find((contact: Contact) => contact.id === contactId) ?? null;
}
```

- Fixed seed per generated dataset (`new SeededRandom(42)`), never `Math.random()` or `Date.now()`.
- Generate lazily and memoize at module level if the dataset is large.
- Document injected anomalies and data-quality defects next to the data: what, where, when.
- Read `.claude/rules/data.md`.

## 3. DAO

Add the method to `src/app/dao/<resource>.dao.ts` (create the DAO if needed) per `.claude/rules/dao.md`: `Observable<T>`, unknown id → `throwError(() => notFound('<Entity>', id))`.

## 4. Verify

`npm run typecheck`, then open the app (`npm start`) and check the screen that consumes it. Note in your report that the dataset lookups and the DAO method need unit tests (`test-agent`).
