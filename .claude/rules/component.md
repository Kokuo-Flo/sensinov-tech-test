---
paths:
  - 'src/**/*.component.ts'
---

# Component rules

## Role

A component is a thin view layer. It only:

- injects services and exposes their signals;
- declares inputs / outputs / models;
- implements user actions (`onClick*`, `onSelect*`) that **delegate** to a service.

Aggregation, filtering, formatting rules, unit conversions → companion service, `utils/` or a pipe. Components never inject a DAO.

## Skeleton

```typescript
@Component({
  selector: 'sb-building-list',
  imports: [RouterLink, KwhPipe],
  templateUrl: './building-list.component.html',
  styleUrl: './building-list.component.scss',
})
export class BuildingListComponent {
  // --- Injections ---
  private readonly _router = inject(Router);
  private readonly _buildingService = inject(BuildingService);

  // --- Inputs ---
  public readonly siteId = input.required<string>();

  // --- Outputs ---
  public readonly buildingSelected = output<Building>();

  // --- Signals from services ---
  public readonly buildings: Signal<Building[]> = this._buildingService.buildings;

  // --- Internal signals ---
  public readonly isEmpty = computed(() => this.buildings().length === 0);

  public onSelectBuilding(building: Building): void {
    this.buildingSelected.emit(building);
    this._router.navigate(['/buildings', building.id]);
  }
}
```

## Rules

- **Never declare `changeDetection`**: OnPush is the default in Angular 22 (ESLint rejects the property). Every value read by the template must therefore be a signal, an input or a `computed()` — a plain mutable field will not refresh the view.
- Signal APIs only: `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `contentChildren()` — never the decorator forms.
- Route params arrive as inputs (`withComponentInputBinding()` is enabled) — no `ActivatedRoute` snapshot plumbing.
- **`computed()` over getters**, always. A getter re-runs on every change-detection pass and hides dependencies.
- **No redundant `signal()`**: if a value can be derived from other signals, it is a `computed()` (or `linkedSignal()` when it must also be locally writable).
- **No wrapper methods** whose body is only `return this.x`.
- **No defensive guards in private methods** for invariants the caller already ensures; no `?.` after a type guard.
- Imports: exact primitives (`RouterLink`, `DecimalPipe`, Material modules…), never `CommonModule`.
- Third-party imperative renderers (Chart.js) are created through an injection token / factory (see `line-chart.factory.ts`), never `new Chart()` inline — the component stays testable with a fake. DOM reads/writes for them happen in `afterRenderEffect` phases, cleanup in `DestroyRef.onDestroy`.
- Members/functions follow the ordering in `docs/STANDARD.md`.
