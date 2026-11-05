---
paths:
  - 'src/**/*.service.ts'
---

# Service rules

## Role

Services own **business logic and state**. They coordinate DAOs and expose read-only signals to components. They never import the dataset (`#data/*`) directly and never touch the DOM.

## Skeleton

```typescript
@Injectable({ providedIn: 'root' })
export class BuildingService {
  // --- Injections ---
  private readonly _buildingDao = inject(BuildingDao);

  // --- Internal signals ---
  private readonly _selectedId = signal<string | null>(null);

  private readonly _buildingsResource = rxResource({
    stream: () => this._buildingDao.getAll(),
    defaultValue: [],
  });

  public readonly buildings: Signal<Building[]> = this._buildingsResource.value;
  public readonly isLoading: Signal<boolean> = this._buildingsResource.isLoading;
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._buildingsResource.error();
    return error === undefined ? null : toDataProblem(error);
  });
  public readonly selectedBuilding = computed(
    () => this.buildings().find((building: Building) => building.id === this._selectedId()) ?? null,
  );

  public select(buildingId: string): void {
    this._selectedId.set(buildingId);
  }
}
```

## Rules

- **Writable signals are private**; expose `asReadonly()` or a `computed()`.
- Derived state is `computed()`, never a second signal synced by hand.
- DAO `Observable`s → `rxResource()` / `toSignal()` at the service boundary; components consume signals only.
- **Errors**: normalize with `toDataProblem()` and expose a `DataProblem | null` signal. Decide on `problem.type` (e.g. `not-found` → empty state), never on parsing `detail`. Turning a problem into a French message is the view's job (pipe or component map), not the service's.
- Long-lived subscriptions: `takeUntilDestroyed(this._destroyRef)`. One-shot DAO calls and `take(1)` are exempt.
- **No timing hacks** (`setTimeout`, `queueMicrotask`, `Promise.resolve().then()`, `requestAnimationFrame`).
- **No DOM access** (`document.*`, `ElementRef.nativeElement` mutations). Single documented exception: `ThemeService` toggles the theme class on `<html>` via `inject(DOCUMENT)` — do not add others.
- Pure computations with no dependency on state belong in `utils/` (testable without TestBed) — the service calls them.
- Companion service (single consumer) lives next to its component; shared services live in `src/app/services/`.
