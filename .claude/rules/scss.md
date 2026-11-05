---
paths:
  - 'src/**/*.scss'
---

# SCSS rules

## Utility-first

Before writing a declaration, check `src/styles/_utilities.scss`. If a class covers it, use the class in the template.

| ❌ In SCSS                   | ✅ In the template           |
| ---------------------------- | ---------------------------- |
| `display: flex`              | `class="flex"`               |
| `flex-direction: column`     | `class="flex-column"`        |
| `align-items: center`        | `class="items-center"`       |
| `justify-content: space-between` | `class="justify-between"` |
| `gap: 8px`                   | `class="gap-sm"`             |
| `padding: 16px`              | `class="p-lg"`               |
| `color: var(--mat-sys-on-surface-variant)` | `class="text-muted"` |
| `font-weight: 600`           | `class="text-strong"`        |
| custom badge styles          | `class="tag"` / `class="tag tag--neutral"` |
| error / empty box styles     | `class="callout"` / `class="callout callout--error"` |

## What belongs in a component `.scss`

- `:host` display rules;
- grid templates, fixed dimensions from a design decision, sticky/absolute positioning;
- transitions and animations;
- state modifiers that combine several properties.

## One source of truth — Material system variables + spacing tokens

| Need                                   | Use                                                        |
| -------------------------------------- | ---------------------------------------------------------- |
| Color, typography, radius, elevation   | `--mat-sys-*` (Material 3 theme, `src/styles/_theme.scss`) |
| Spacing, layout size, motion duration  | `--space-*`, `--size-*`, `--motion-*` (`_tokens.scss`)     |

```scss
// ❌ local values — and never a color literal outside _theme.scss / _theme-colors.scss
border: 1px solid #d9dee5;
padding: 12px;
border-radius: 8px;
// ✅
border: 1px solid var(--mat-sys-outline-variant);
padding: var(--space-md);
border-radius: var(--mat-sys-corner-medium);
font: var(--mat-sys-body-medium);
```

- Missing color/typography need → pick the right Material role (`primary`, `on-surface-variant`, `error-container`, `surface-container-high`…); if none fits, add an override in `_theme.scss`, never a local value.
- Restyling a Material component → its `mat.<component>-overrides()` mixin in `_theme.scss`, never by targeting internal `.mat-mdc-*` classes from a component stylesheet.
- Dark mode is handled by the theme (`light-dark()` + `html.app-dark`). Component SCSS never contains dark-mode rules.
- Missing spacing/layout token → add it to `_tokens.scss`; reusable helper → `_utilities.scss`.

## BEM

```scss
.building-card { }
.building-card__header { }
.building-card--alert { }
```

Bound from the template with `[class.building-card--alert]="hasAlert()"`. No tag or id selectors, no `::ng-deep`, no `!important`.
