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
    expect(title?.getAttribute('href')).toBe('/priorities');
  });

  it.each([
    ['nav-priorities', 'Priorités', '/priorities'],
    ['nav-buildings', 'Bâtiments', '/buildings'],
    ['nav-findings', 'Anomalies', '/findings'],
    ['nav-reports', 'Rapport analyste', '/reports'],
  ])('should link %s to %s', async (testId, label, href) => {
    const root = await render();

    const link = root.querySelector(`[data-testid="${testId}"]`);

    expect(link?.textContent?.trim()).toBe(label);
    expect(link?.getAttribute('href')).toBe(href);
  });

  it('should include the theme toggle', async () => {
    const root = await render();

    expect(root.querySelector('[data-testid="theme-toggle"]')).not.toBeNull();
  });
});
