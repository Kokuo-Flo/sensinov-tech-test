---
paths:
  - 'src/**/*.pipe.ts'
---

# Pipe rules

- Standalone, **pure** (default) — an impure pipe needs a justification comment.
- Presentation only: formatting units, dates, labels. No business decision (thresholds, prioritization) — that belongs to a service or util.
- The `transform` body delegates to a pure function in `utils/` when the logic is reusable outside templates.
- Typed input and output; handle `null` / `undefined` explicitly when the input can be absent.
- Dates and numbers formatted for the `fr-FR` locale.

```typescript
@Pipe({ name: 'kwh' })
export class KwhPipe implements PipeTransform {
  public transform(valueWh: number | null): string {
    if (valueWh === null) {
      return '—';
    }
    return formatKwh(valueWh);
  }
}
```
