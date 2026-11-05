# Code Standards

> **Single source of truth** for coding standards in this repository. Every agent reads it before any code-related task.
> File-type specifics live in `.claude/rules/*.md` and must not contradict this file.

---

## Architecture — organized by type, not by feature

```
src/
├── app/
│   ├── components/     UI components — one folder per component (routed pages included)
│   ├── services/       App-level services: business logic + state, shared by several components
│   ├── dao/            Data access — HTTP only, one DAO per backend resource
│   ├── models/         Types, interfaces, constants, pure functions on those types
│   ├── pipes/          Pure presentation transforms shared by several templates
│   ├── directives/     Attribute directives shared by several components
│   ├── utils/          Cross-cutting pure functions (no DI, no state)
│   ├── mocks/          Fake backend (interceptor + data generators) — THROWAWAY MOCK
│   ├── app.component.* Shell (header + router outlet)
│   ├── app.config.ts   Root providers
│   └── app.routes.ts   Route table
├── assets/             Static files copied as-is, served under /assets/ (favicon, images)
├── styles/             Design tokens, base styles, utility classes
└── testing/            Test-only helpers (never imported by production code)
```

### Placement rules

- **Components**: `components/<name>/<name>.component.{ts,html,scss,spec.ts}`. A child component rendered by a single host lives in `components/<host>/components/<child>/`; a component reused by several hosts stays at `components/` root.
- **Companion service**: a service consumed by a **single** component lives next to it (`components/<name>/<name>.service.ts`). As soon as a second consumer appears, move it to `services/`.
- **DAO**: always `dao/<resource>.dao.ts`. A DAO is not a service.
- **Types**: always `models/<concept>.model.ts`, one file per domain concept. No type declared in a component, service or DAO file except private, file-local helper types.
- **Pipes / directives**: `pipes/<name>.pipe.ts`, `directives/<name>.directive.ts` when shared; next to the owner when single-consumer.
- **Utils**: pure functions in `utils/<name>.utils.ts`. Anything that needs DI or holds state is a service.

### Data flow

```
Component  ──calls──▶  Service (state: signals, business logic)  ──calls──▶  DAO (HttpClient)  ──▶  /api/*
    ▲                          │                                                                   │
    └──── reads signals ───────┘                                    mocks/ interceptor answers ◀───┘
```

- Components never inject a DAO or `HttpClient`.
- Services never inject `HttpClient`.
- The mock backend is an HTTP interceptor: swapping to a real API means removing it, nothing else changes.

---

## TypeScript

### Compiler — maximum strictness (`tsconfig.json`)

The compiler is the first line of defense. These flags are **non-negotiable**; never relax one to make code compile — fix the code.

| Flag                                    | Bug class it removes                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `strict`                                | implicit `any`, unchecked `null`/`undefined`, unsafe `this`, catch `any` |
| `exactOptionalPropertyTypes`            | confusing "absent" with "present but `undefined`"                        |
| `noUncheckedIndexedAccess`              | assuming `array[i]` / `record[key]` exists                               |
| `noPropertyAccessFromIndexSignature`    | typos hidden behind index signatures                                     |
| `noImplicitOverride`                    | silent override / broken override after a base-class rename             |
| `noImplicitReturns`                     | code paths forgetting to return                                          |
| `noFallthroughCasesInSwitch`            | accidental `switch` fall-through                                         |
| `noUnusedLocals` / `noUnusedParameters` | dead code, forgotten wiring                                              |
| `noUncheckedSideEffectImports`          | side-effect imports pointing at nothing                                  |
| `allowUnreachableCode: false`           | unreachable statements                                                   |
| `verbatimModuleSyntax`                  | ambiguous import elision — type imports are explicit (`import { type X }`) |
| `erasableSyntaxOnly`                    | TS-only runtime constructs (`enum`, `namespace`, parameter properties)   |
| `strictTemplates` + `typeCheckHostBindings` | untyped template and host bindings                                   |
| `strictStandalone`                      | non-standalone components                                                |
| `extendedDiagnostics: error`            | Angular template smells (nullish coalescing on non-nullable, uncalled signals…) |

Consequences in code:

- **No `enum`** — use a union of string literals plus a `const` array when the values must be iterated:
  ```typescript
  export const EQUIPMENT_TYPES = ['energy', 'occupancy', 'temperature', 'hvac'] as const;
  export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
  ```
- **Indexed access returns `T | undefined`** — handle it (`.find()` + guard, `?? fallback`), never `!`.
- **Optional properties**: `prop?: T` means "may be absent"; write `prop?: T | undefined` only when explicitly assigning `undefined` is a valid state.
- **Type-only imports** use the inline form: `import { type Routes } from '@angular/router';` (autofixed by `npm run lint:fix`).

### Types & safety

- **No `any`**, no `as any`, no `$any()` in templates, no non-null assertion `!`. If the right type is not reachable, stop and raise it.
- `unknown` for values of unknown shape, narrowed with a type guard (`value is T`) living in `models/`.
- **API contract**: a success carries the bare payload `T` (no envelope); an error carries the real HTTP status and an RFC 9457 Problem Details body, typed `ApiProblem` (`models/api.model.ts`). Any caught error is normalized once with `toApiProblem()` (`utils/http-error.utils.ts`); the UI maps `problem.type` to a French message — the backend never dictates UI copy.
- **Explicit access modifier** (`public` / `protected` / `private`) on every class member.

### Dependency injection

- `inject()` only. **No constructor injection.**
- `providedIn: 'root'` unless a narrower injector is required.
- Inject ordering: 1. Angular services (`DestroyRef`, `Router`…), 2. app services/DAOs.

### Member ordering (top to bottom, with section comments)

1. Injections (`inject()`)
2. Constants (`readonly`)
3. Inputs (`input()`, `input.required()`)
4. Outputs (`output()`)
5. Models (`model()`)
6. Signals exposed from services
7. Internal signals (`signal()`, `computed()`, `linkedSignal()`)
8. Other members (`viewChild()`, …)

### Function ordering

1. Lifecycle hooks
2. Public — event handlers (`onClick*`, `onSelect*`) first, then other public methods
3. Protected
4. Private — `_init*` → `_update*` → `_handle*` → `_get*`

### Naming

- Selector prefix: `sb-` (components), `sb` camelCase (directives) — enforced by ESLint.
- Classes carry their type suffix: `BuildingListComponent`, `BuildingService`, `BuildingDao`, `KwhPipe`.
- Observables end with `$`.
- **Private members** (fields, injected services, methods) start with `_`. `public` / `protected` never do — enforced by ESLint.
- No single-letter or ambiguous identifiers, including in arrow callbacks (`buildings.map((building: Building) => …)`).

### Control flow

- Early return with guard clauses; never wrap a whole body in `if/else`.
- No defensive guard re-checking an invariant the caller already guarantees.
- No `continue` — filter upstream.
- Arrow-function parameters are typed; return types are inferred.

### State & reactivity

- **Signals** (`signal`, `computed`, `linkedSignal`) for state, **RxJS** for async streams (HTTP), bridged with `toSignal()` / `rxResource()` at the service boundary.
- Derivable state is a `computed()`, never a second `signal()` kept in sync by hand.
- `computed()` over getters — always.
- Long-lived subscriptions use `takeUntilDestroyed()`; HTTP one-shots and `take(1)` are exempt.
- No timing hacks (`setTimeout`, `queueMicrotask`, `Promise.resolve().then()`) to work around change detection.

### Comments

- English only, and only where the code is not self-explanatory (non-trivial algorithm, workaround, counter-intuitive decision).
- Never paraphrase code, never decorative section banners beyond the member-ordering section comments, never ticket numbers.
- `THROWAWAY MOCK` tag on every file of `src/app/mocks/`.

---

## Components

- Standalone (default). **OnPush is the default change detection in Angular 22: never declare `changeDetection`** — enforced by ESLint. Components rely on signals for every value the template reads.
- **Minimal logic**: inject services, expose their signals, implement user actions that delegate. Business rules, aggregation, formatting logic → service, util or pipe.
- No `CommonModule`; import the exact primitives needed.

## Templates

- Built-in control flow only: `@if`, `@for` (with `track` on a stable id), `@switch`, `@let`, `@defer`.
- No calculations or chained expressions in templates — expose a `computed()`.
- `[class.x]` / `[style.x]` — never `ngClass` / `ngStyle`.
- `data-cy` on every interactive or asserted element.
- **UI language: French.** Strings live in templates (single-language POC — no i18n framework).

## Styling

- Design tokens (`src/styles/_tokens.scss`) as CSS variables — never hardcode colors, spacing, font sizes or radii.
- **Utility-first**: use classes from `src/styles/_utilities.scss` in templates before writing SCSS.
- Component `.scss` contains only what utilities cannot express (grid templates, fixed dimensions, animations), with BEM naming.

---

## Testing

- **Vitest** through `ng test` (zoneless, jsdom).
- Service mocks via `provideServiceMock()` / `provideServiceMocks()` from `#testing/service-mock`.
- HTTP via `provideHttpClient()` + `provideHttpClientTesting()` and `HttpTestingController`.
- DOM queries via `[data-cy="…"]` only.
- Coverage target ≥ 80 % on new or modified code.
- Every assertion could fail if the behavior regressed — see `.claude/rules/spec.md`.

---

## Imports

- Reaching a parent folder → `#` subpath alias declared in `package.json` `imports` (`#services/building.service`, `#models/building.model`). Same-folder and child imports stay relative (`./x`). Enforced by ESLint (`no-restricted-imports` on `../*`).
- Aliases target `.ts` files: a barrel is `#alias/folder/index`.
- New top-level type folder → add its alias to `package.json` `imports` in the same change.

---

## Commands

| Command                  | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `npm start`              | Dev server on http://localhost:4200                           |
| `npm run typecheck`      | AOT type-check of production code + templates (fast feedback) |
| `npm run typecheck:spec` | Type-check of specs and test helpers                          |
| `npm run lint`           | ESLint (TS + templates), **fails on any warning**; `lint:fix` to autofix |
| `npm test`               | Full Vitest run, single pass; any console warning/error fails the test |
| `npm run test:coverage`  | Vitest run with coverage (`coverage/` html + text summary)    |
| `npm run build`          | Production build                                              |
| `npm run build:strict`   | Production build that **fails on any warning**                |
| `npm run validate`       | `lint` + `typecheck` + `build:strict` — production code gate  |
| `npm run check`          | `lint` + `typecheck` + `typecheck:spec` + `test` + `build:strict` — **ready for review** |

**Zero warning policy**: a warning is an error. Never silence one — inline `eslint-disable` is ignored (`noInlineConfig`), `@ts-ignore` / `@ts-expect-error` are banned; fix the cause.
