import { TestBed } from '@angular/core/testing';

import { DARK_THEME_CLASS } from '#models/theme.model';

import { ThemeService } from './theme.service';

const STORAGE_KEY = 'sb-theme-mode';

function stubPrefersDark(prefersDark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({ matches: prefersDark && query.includes('dark') })),
  });
}

function removeMatchMedia(): void {
  Reflect.deleteProperty(window, 'matchMedia');
}

function createService(): ThemeService {
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
    removeMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove(DARK_THEME_CLASS);
    removeMatchMedia();
  });

  describe('initial mode', () => {
    it('should use the persisted dark mode', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');

      const service = createService();

      expect(service.mode()).toBe('dark');
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(true);
    });

    it('should use the persisted light mode over the OS preference', () => {
      stubPrefersDark(true);
      localStorage.setItem(STORAGE_KEY, 'light');

      const service = createService();

      expect(service.mode()).toBe('light');
      expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(false);
    });

    it('should ignore an invalid persisted value and fall back to the OS preference', () => {
      stubPrefersDark(true);
      localStorage.setItem(STORAGE_KEY, 'sepia');

      const service = createService();

      expect(service.mode()).toBe('dark');
    });

    it('should fall back to the OS preference when storage throws', () => {
      stubPrefersDark(true);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });

      const service = createService();

      expect(service.mode()).toBe('dark');
    });

    it('should be light when the OS prefers light', () => {
      stubPrefersDark(false);

      const service = createService();

      expect(service.mode()).toBe('light');
      expect(service.isDark()).toBe(false);
    });

    it('should be light when matchMedia is not available', () => {
      const service = createService();

      expect(service.mode()).toBe('light');
    });
  });

  describe('toggle', () => {
    it('should switch to dark, persist it and set the class on <html>', () => {
      const service = createService();

      service.toggle();

      expect(service.mode()).toBe('dark');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(true);
    });

    it('should switch back to light and remove the class', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const service = createService();

      service.toggle();

      expect(service.mode()).toBe('light');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
      expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(false);
    });

    it('should still toggle when storage throws on write', () => {
      const service = createService();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });

      service.toggle();

      expect(service.mode()).toBe('dark');
      expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(true);
    });
  });
});
