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
| `color: var(--color-danger)` | `class="text-danger"`        |
| `font-weight: 600`           | `class="text-strong"`        |

## What belongs in a component `.scss`

- `:host` display rules;
- grid templates, fixed dimensions from a design decision, sticky/absolute positioning;
- transitions and animations;
- state modifiers that combine several properties.

## Tokens only

Every color, spacing, font size, radius and shadow comes from `src/styles/_tokens.scss`:

```scss
// ❌
border: 1px solid #d9dee5;
padding: 12px;
// ✅
border: 1px solid var(--color-border);
padding: var(--space-md);
```

A missing token is added to `_tokens.scss` (and a missing utility to `_utilities.scss`) — never hardcoded locally.

## BEM

```scss
.building-card { }
.building-card__header { }
.building-card--alert { }
```

Bound from the template with `[class.building-card--alert]="hasAlert()"`. No tag or id selectors, no `::ng-deep`, no `!important`.
