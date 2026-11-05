---
name: apply-design-system
description: Apply the app design system (tokens, utility classes, BEM, French UI copy, data-cy) to a component template and stylesheet. Use when writing or reviewing a *.component.html or *.scss.
---

# Apply design system

## 1. Inventory what exists

Read `src/styles/_tokens.scss` and `src/styles/_utilities.scss` before writing any markup or style.

## 2. Layout and spacing with utilities, in the template

| Need                      | Classes                              |
| ------------------------- | ------------------------------------ |
| Row, centered vertically  | `flex items-center gap-sm`           |
| Column stack              | `flex flex-column gap-md`            |
| Spread header             | `flex items-center justify-between`  |
| Card                      | `bg-surface border rounded shadow p-lg` |
| Fill remaining space      | `flex-1`                             |
| Title / section heading   | `text-title` / `text-heading`        |
| Secondary text            | `text-muted text-caption`            |
| Status color              | `text-success` · `text-warning` · `text-danger` |

Spacing scale: `xs`=4 · `sm`=8 · `md`=12 · `lg`=16 · `xl`=24 · `2xl`=32 (px), prefixes `gap-` `p-` `px-` `py-` `m-` `mt-` `mb-`.

## 3. Component SCSS only for the rest

- `:host { display: block; }` when the host must lay out.
- Grid templates, fixed sizes, sticky headers, transitions — with BEM names and tokens only.
- Missing token or utility used in ≥ 2 places → add it to `_tokens.scss` / `_utilities.scss` rather than inlining.

## 4. State styling

Modifiers via `[class.block--modifier]="isX()"`; colors via semantic tokens (`--color-danger`, never a hex).

## 5. Copy and test hooks

- French, short, action-oriented labels written in the template.
- Units always shown with values (`kWh`, `°C`, `kgCO₂e`, `%`).
- `data-cy` on every interactive or asserted element, kebab-case, named after the role: `building-card`, `equipment-chart`, `period-select`.

## 6. Self-check

- [ ] No hex color, raw px or font-size in component SCSS
- [ ] No SCSS declaration a utility already provides
- [ ] No `ngClass` / `ngStyle` / inline `style="…"`
- [ ] Every interactive element is a `<button>` or `<a>` with `data-cy`
