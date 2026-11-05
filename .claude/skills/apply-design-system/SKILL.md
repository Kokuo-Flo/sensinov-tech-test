---
name: apply-design-system
description: Apply the app design system (Angular Material 3 theme, --mat-sys-* variables, spacing tokens, utility classes, BEM, French UI copy, data-testid) to a component template and stylesheet. Use when writing or reviewing a *.component.html or *.scss.
---

# Apply design system

## 1. Know the single source of truth

Read `src/styles/_theme.scss` (Material 3 theme, light/dark overrides, component overrides), `src/styles/_tokens.scss` (spacing, layout sizes, motion) and `src/styles/_utilities.scss` before writing markup or styles.

- Colors, typography, radii, elevation → `--mat-sys-*` only.
- Spacing, layout sizes, motion → `--space-*`, `--size-*`, `--motion-*`.
- No color literal outside `_theme.scss` / `_theme-colors.scss`. No dark-mode rule outside the theme.

## 2. Pick the Material component first

| Need                         | Use                                                    |
| ---------------------------- | ------------------------------------------------------ |
| Data table, sortable         | `mat-table` + `matSort`, sorting through a `computed()` |
| Section / header block       | `mat-card` (`mat-card-header`, `mat-card-content`)     |
| Single choice from a list    | `mat-select` in a `mat-form-field`                     |
| Few exclusive options        | `mat-button-toggle-group`                              |
| On/off setting               | `mat-slide-toggle`                                     |
| Loading                      | `mat-progress-bar` (`aria-hidden`) + `sr-only` text in a `role="status"` region |
| App bar                      | `mat-toolbar`                                          |

Nothing in Material for it (breadcrumb, tag, callout)? Use the existing local component (`sb-breadcrumb`) or utility (`tag`, `callout`), otherwise create a small component styled with `--mat-sys-*`.

## 3. Layout and text with utilities, in the template

| Need                     | Classes                                     |
| ------------------------ | ------------------------------------------- |
| Row, centered vertically | `flex items-center gap-sm`                  |
| Column stack             | `flex flex-column gap-md`                   |
| Spread header            | `flex items-center justify-between`         |
| Push to the right        | `ml-auto`                                   |
| Title / section heading  | `text-title` / `text-heading`               |
| Secondary text           | `text-muted text-caption`                   |
| Label / badge            | `tag`, `tag tag--neutral`                   |
| Error / empty message    | `callout callout--error`, `callout`         |
| Numeric table column     | `cell-numeric`                              |
| Screen-reader only       | `sr-only`                                   |

Spacing scale: `2xs`=2 · `xs`=4 · `sm`=8 · `md`=12 · `lg`=16 · `xl`=24 · `2xl`=32 (px), prefixes `gap-` `p-` `px-` `py-` `m-` `mt-` `mb-`.

## 4. Component SCSS only for the rest

- `:host { display: block; }` when the host must lay out.
- Grid templates, fixed sizes, sticky headers, transitions — BEM names, `--mat-sys-*` and tokens only.
- Restyling a Material component → `mat.<component>-overrides()` in `_theme.scss`, never internal `.mat-mdc-*` selectors in a component stylesheet.

## 5. Copy, accessibility and test hooks

- French, short labels in the template; units always shown with values (`kWh`, `Wh`, `°C`, `%`).
- Status regions: `role="status"` + `aria-busy` for loading, `role="alert"` for errors.
- `data-testid` on every interactive or asserted element, kebab-case, named after the role.

## 6. Self-check

- [ ] Checked in both light and dark mode (theme toggle in the toolbar)
- [ ] No color literal, raw px font size or radius in component SCSS
- [ ] No SCSS declaration a utility already provides
- [ ] No `ngClass` / `ngStyle` / inline `style="…"`
- [ ] Table rows typed via `sbTemplateItemOf`
- [ ] Every interactive element is a real `<button>` / `<a>` / Material control with `data-testid`
