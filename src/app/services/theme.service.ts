import { DOCUMENT } from '@angular/common';
import { computed, Injectable, inject, signal } from '@angular/core';

import { DARK_THEME_CLASS, isThemeMode, type ThemeMode } from '#models/theme.model';

/**
 * Light / dark mode of the whole app. The mode is applied as `DARK_THEME_CLASS` on `<html>`:
 * CDK overlays (select panels) are appended to `<body>`, so the class must sit on the root
 * element. This is the only service allowed to touch the DOM.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  // --- Injections ---
  private readonly _document = inject(DOCUMENT);

  // --- Constants ---
  public readonly STORAGE_KEY = 'sb-theme-mode';

  // --- Internal signals ---
  /** Persisted choice, else the OS preference. */
  private readonly _mode = signal<ThemeMode>(this._getInitialMode());

  public readonly mode = this._mode.asReadonly();
  public readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    this._applyMode(this._mode());
  }

  public toggle(): void {
    const nextMode: ThemeMode = this.isDark() ? 'light' : 'dark';
    this._mode.set(nextMode);
    this._persistMode(nextMode);
    this._applyMode(nextMode);
  }

  private _applyMode(mode: ThemeMode): void {
    this._document.documentElement.classList.toggle(DARK_THEME_CLASS, mode === 'dark');
  }

  private _persistMode(mode: ThemeMode): void {
    // Storage may be unavailable (private browsing, disabled cookies): the choice is then not kept.
    try {
      this._document.defaultView?.localStorage.setItem(this.STORAGE_KEY, mode);
    } catch {
      return;
    }
  }

  private _getInitialMode(): ThemeMode {
    return this._getPersistedMode() ?? this._getPreferredMode();
  }

  private _getPersistedMode(): ThemeMode | null {
    try {
      const value = this._document.defaultView?.localStorage.getItem(this.STORAGE_KEY) ?? null;
      return value !== null && isThemeMode(value) ? value : null;
    } catch {
      return null;
    }
  }

  private _getPreferredMode(): ThemeMode {
    const view = this._document.defaultView;
    // `matchMedia` is missing from some non-browser environments (jsdom).
    if (view === null || typeof view.matchMedia !== 'function') {
      return 'light';
    }
    return view.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
