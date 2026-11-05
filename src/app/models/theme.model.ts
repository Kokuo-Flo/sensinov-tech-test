export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Class set on `<html>` for dark mode; `src/styles/_theme.scss` switches `color-scheme` on it. */
export const DARK_THEME_CLASS = 'app-dark';

export function isThemeMode(value: string): value is ThemeMode {
  return THEME_MODES.some((mode: ThemeMode) => mode === value);
}
