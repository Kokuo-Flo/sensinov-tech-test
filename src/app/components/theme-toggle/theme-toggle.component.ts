import { Component, computed, inject } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';

import { ThemeService } from '#services/theme.service';

@Component({
  selector: 'sb-theme-toggle',
  imports: [MatSlideToggle],
  templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
  // --- Injections ---
  private readonly _themeService = inject(ThemeService);

  // --- Signals from services ---
  public readonly isDarkTheme = this._themeService.isDark;

  // --- Internal signals ---
  /** Names the action the switch performs, not its current state. */
  public readonly toggleLabel = computed(() =>
    this.isDarkTheme() ? 'Activer le thème clair' : 'Activer le thème sombre',
  );

  public onToggleTheme(): void {
    this._themeService.toggle();
  }
}
