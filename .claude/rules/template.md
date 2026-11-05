---
paths:
  - 'src/**/*.component.html'
---

# Template rules

## Control flow — built-in only

```html
@if (isLoading()) {
  <p class="text-muted">Chargement…</p>
} @else {
  @for (building of buildings(); track building.id) {
    <sb-building-card [building]="building" data-testid="building-card" />
  } @empty {
    <p class="text-muted" data-testid="building-list-empty">Aucun bâtiment</p>
  }
}
@let selected = selectedBuilding();
```

- `@for` always tracks a stable identity (`item.id`), never `$index` unless the list is static.
- `@defer` (with `@placeholder`) for heavy, below-the-fold content such as charts.
- Never `*ngIf`, `*ngFor`, `*ngSwitch`, `ngClass`, `ngStyle`.

## Angular Material

- Prefer the Material component for the need: `mat-table` + `matSort` (tables), `mat-select`, `mat-button-toggle-group`, `mat-slide-toggle`, `mat-card`, `mat-progress-bar` (loading), `mat-toolbar`. Import each module/component in the component's `imports`, nothing global.
- **Typed rows**: Material cell templates are `TemplateRef<any>`. When a row variable is read, use the long form with the typing directive:
  ```html
  <td mat-cell *matCellDef="let row"></td>                              <!-- ❌ row is any -->
  <ng-template matCellDef let-building [sbTemplateItemOf]="buildings()"> <!-- ✅ building: Building -->
    <td mat-cell>{{ building.name }}</td>
  </ng-template>
  ```
- Status regions: loading → `role="status"` + `aria-busy` + screen-reader text (`sr-only`), error → `role="alert"` in a `callout callout--error`.

## No logic in templates

Reading signals and calling event handlers is fine. Calculations, ternary chains, `.filter()`, string building, unit conversion are not: expose a `computed()` or use a pipe.

```html
<!-- ❌ -->
{{ (building().consumptionWh / 1000).toFixed(1) }} kWh
<!-- ✅ -->
{{ building().consumptionWh | kwh }}
```

## Bindings

- `[class.block__element--modifier]="condition()"`, `[style.width.%]="ratio()"`.
- Event handlers typed on the component side: `(input)="onSearch($event)"` with `onSearch(event: Event)` casting internally — never `$any($event)`.
- A binding must resolve to a real member — `strictTemplates` turns a dead binding into a compile error.

## Testability

`data-testid="kebab-case-name"` on every interactive element and every element a test asserts on (titles, counters, list items, empty states).

## Language & accessibility

- UI strings in **French**, written directly in the template.
- Interactive elements are real `<button>` / `<a>`; images have `alt`; form controls have a label (enforced by the template accessibility lint config).
