import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { type BreadcrumbLink } from '#models/breadcrumb.model';

import { BreadcrumbComponent } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;

  async function render(items: BreadcrumbLink[]): Promise<HTMLElement> {
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BreadcrumbComponent);
  });

  it('should render a link for a step with a routerLink', async () => {
    const root = await render([
      { label: 'Bâtiments', routerLink: '/buildings', testId: 'crumb-root' },
    ]);

    const link = root.querySelector('a[data-testid="crumb-root"]');

    expect(link?.textContent?.trim()).toBe('Bâtiments');
    expect(link?.getAttribute('href')).toBe('/buildings');
  });

  it('should render the current page as plain text flagged aria-current', async () => {
    const root = await render([
      { label: 'Bâtiments', routerLink: '/buildings', testId: 'crumb-root' },
      { label: 'Varsovie', routerLink: null, testId: 'crumb-current' },
    ]);

    const current = root.querySelector('[data-testid="crumb-current"]');

    expect(current?.tagName).toBe('SPAN');
    expect(current?.textContent?.trim()).toBe('Varsovie');
    expect(current?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('[data-testid="crumb-root"]')?.hasAttribute('aria-current')).toBe(
      false,
    );
  });

  it('should expose an accessible French navigation label', async () => {
    const root = await render([]);

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe("Fil d'Ariane");
  });
});
