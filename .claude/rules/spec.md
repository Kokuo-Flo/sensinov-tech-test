---
paths:
  - 'src/**/*.spec.ts'
  - 'src/testing/**/*.ts'
---

# Test rules (Vitest)

## Setup

- Runner: Vitest via `ng test` (zoneless, jsdom). Globals `describe` / `it` / `expect` / `vi` are available.
- Service mocks: `provideServiceMock(Service, overrides)` / `provideServiceMocks([A, B])` from `#testing/service-mock`. Signals and observables go in `overrides`:
  ```typescript
  providers: [provideServiceMock(BuildingService, { buildings: signal([BUILDING_FIXTURE]) })];
  ```
  Never hand-roll `{ provide: X, useValue: { … } }` for an app service.
- DAO specs: plain `TestBed.inject(Dao)` against the real dataset — assert known ids, ranges and the `DataProblemError` paths (`not-found`, `invalid-metric`).
- **Console is a failure**: any `console.warn` / `console.error` during a test fails it (`src/testing/setup-tests.ts`, loaded globally). When a test expects console output, assert it on the spy (`vi.mocked(console.error)`), then `.mockClear()` it.
- Async: `await fixture.whenStable()`; timers via `vi.useFakeTimers()` / `vi.advanceTimersByTime()`. No `fakeAsync` (no zone.js), **no real `setTimeout`**.
- Component specs whose children are irrelevant: `TestBed.overrideComponent(C, { set: { imports: [] } })` or `{ set: { template: '' } }` — never `NO_ERRORS_SCHEMA`.
- Pure functions (`utils/`, `models/`, dataset generators): plain `describe` / `it`, no TestBed.

## Shape

- `describe('BuildingService', …)` / `it('should <observable behavior>', …)`.
- Arrange / Act / Assert, separated by a blank line.
- Fixtures contain only the fields the test needs; build them with a small factory in the spec or in `src/testing/`.
- DOM queries: `[data-testid="…"]` only.

## Forbidden — each one is a blocker

Every test must answer **yes** to: *"Could this fail if the production behavior regressed?"*

```typescript
expect(component).toBeTruthy();                // sole assertion — proves nothing
expect(result).toBeDefined();                  // idem
expect(spy).toHaveBeenCalled();                // without args when args matter → toHaveBeenCalledWith(...)
expect(list[0].id).toBe('a');                  // positional access → list.find(...)
(service as any)._privateMethod();             // private access → go through the public API
expect(CONSTANT).toEqual([...]);               // tautology
req.flush(payload); expect(result).toEqual(payload); // passthrough — only valid if the code transforms data
```

Also forbidden: `any` / `as any`, non-null `!`, `NO_ERRORS_SCHEMA`, `--watch`, testing Angular itself (manual `output.emit()` then asserting the spy).

## Required

- Each service/DAO method: at least one **error or edge path** (not-found, empty list, missing value).
- Each `computed()` with branches: one test per branch.
- Coverage ≥ 80 % on new or modified code.
