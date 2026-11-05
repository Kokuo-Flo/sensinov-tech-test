import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ThemeService } from '#services/theme.service';
import { provideServiceMock } from '#testing/service-mock';

import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  const isDark = signal(false);

  function button(): HTMLButtonElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="theme-toggle"] button',
    );
    if (element === null) {
      throw new Error('theme toggle button not rendered');
    }
    return element;
  }

  beforeEach(async () => {
    isDark.set(false);
    TestBed.configureTestingModule({
      providers: [provideServiceMock(ThemeService, { isDark })],
    });
    fixture = TestBed.createComponent(ThemeToggleComponent);
    await fixture.whenStable();
  });

  it('should offer the dark theme while in light mode', () => {
    expect(button().getAttribute('aria-label')).toBe('Activer le thème sombre');
    expect(button().getAttribute('aria-checked')).toBe('false');
  });

  it('should offer the light theme while in dark mode', async () => {
    isDark.set(true);
    await fixture.whenStable();

    expect(button().getAttribute('aria-label')).toBe('Activer le thème clair');
    expect(button().getAttribute('aria-checked')).toBe('true');
  });

  it('should toggle the theme when the switch is clicked', async () => {
    button().click();
    await fixture.whenStable();

    expect(TestBed.inject(ThemeService).toggle).toHaveBeenCalledTimes(1);
  });
});
