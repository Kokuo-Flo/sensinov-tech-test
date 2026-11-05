import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ThemeService } from '#services/theme.service';
import { provideServiceMock } from '#testing/service-mock';
import { signal } from '@angular/core';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideServiceMock(ThemeService, { isDark: signal(false) })],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('should render the application title in the header', async () => {
    const root = await render();

    const title = root.querySelector('[data-testid="app-title"]');

    expect(title?.textContent?.trim()).toBe('Smart Building');
    expect(title?.getAttribute('href')).toBe('/buildings');
  });

  it('should link the main navigation to buildings and reports', async () => {
    const root = await render();

    const buildings = root.querySelector('[data-testid="nav-buildings"]');
    const reports = root.querySelector('[data-testid="nav-reports"]');

    expect(buildings?.textContent?.trim()).toBe('Bâtiments');
    expect(buildings?.getAttribute('href')).toBe('/buildings');
    expect(reports?.textContent?.trim()).toBe('Rapport analyste');
    expect(reports?.getAttribute('href')).toBe('/reports');
  });

  it('should include the theme toggle', async () => {
    const root = await render();

    expect(root.querySelector('[data-testid="theme-toggle"]')).not.toBeNull();
  });
});
