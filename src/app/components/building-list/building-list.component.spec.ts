import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSort } from '@angular/material/sort';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { type DataProblem } from '#models/data-problem.model';
import { makeBuilding } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { BuildingListComponent } from './building-list.component';
import { BuildingListService } from './building-list.service';

registerLocaleData(localeFr);

type ListedBuilding = ReturnType<BuildingListService['buildings']>[number];

function listed(overrides: Partial<ListedBuilding>): ListedBuilding {
  return { ...makeBuilding(), countryName: 'Pologne', ...overrides };
}

describe('BuildingListComponent', () => {
  let fixture: ComponentFixture<BuildingListComponent>;
  let buildings: WritableSignal<ListedBuilding[]>;
  let isLoading: WritableSignal<boolean>;
  let problem: WritableSignal<DataProblem | null>;

  function all(selector: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector),
    );
  }

  function one(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }

  function names(): (string | undefined)[] {
    return all('[data-testid="building-link"]').map((link) => link.textContent?.trim());
  }

  function sortBy(id: string): void {
    fixture.debugElement
      .query(By.directive(MatSort))
      .injector.get(MatSort)
      .sort({ id, start: 'asc', disableClear: false });
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(BuildingListComponent);
    await fixture.whenStable();
  }

  beforeEach(() => {
    buildings = signal<ListedBuilding[]>([]);
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideServiceMock(BuildingListService, { buildings, isLoading, problem }),
      ],
    });
  });

  it('should show the loading state only', async () => {
    isLoading.set(true);

    await render();

    expect(one('[data-testid="building-list-loading"]')).not.toBeNull();
    expect(one('[data-testid="building-table"]')).toBeNull();
    expect(one('[data-testid="building-list-error"]')).toBeNull();
  });

  it('should show the French error message', async () => {
    problem.set({ type: 'unknown-error', title: 'x' });

    await render();

    expect(one('[data-testid="building-list-error"]')?.textContent?.trim()).toBe(
      'Une erreur est survenue. Réessayez plus tard.',
    );
    expect(one('[data-testid="building-table"]')).toBeNull();
  });

  it('should show the empty state when there is no building', async () => {
    await render();

    expect(one('[data-testid="building-list-empty"]')?.textContent?.trim()).toBe('Aucun bâtiment.');
    expect(all('[data-testid="building-row"]')).toHaveLength(0);
  });

  it('should render a row per building with a link to its page', async () => {
    buildings.set([
      listed({
        id: 'bld-a',
        name: 'Alpha',
        city: 'Lyon',
        countryName: 'France',
        surfaceM2: 12500,
        constructionYear: 1998,
      }),
    ]);

    await render();

    const link = one('[data-testid="building-link"]');
    expect(all('[data-testid="building-row"]')).toHaveLength(1);
    expect(link?.textContent?.trim()).toBe('Alpha');
    expect(link?.getAttribute('href')).toBe('/buildings/bld-a');
    expect(one('[data-testid="building-city"]')?.textContent?.trim()).toBe('Lyon');
    expect(one('[data-testid="building-country"]')?.textContent?.trim()).toBe('France');
    expect(one('[data-testid="building-surface"]')?.textContent?.replace(/\s/g, ' ')).toBe(
      '12 500 m²',
    );
    expect(one('[data-testid="building-year"]')?.textContent?.trim()).toBe('1998');
    expect(one('[data-testid="building-list-empty"]')).toBeNull();
  });

  it('should sort by name ascending by default', async () => {
    buildings.set([listed({ id: 'z', name: 'Zeta' }), listed({ id: 'a', name: 'Alpha' })]);

    await render();

    expect(names()).toEqual(['Alpha', 'Zeta']);
  });

  it('should reorder the rows when another column is sorted', async () => {
    buildings.set([
      listed({ id: 'a', name: 'Alpha', surfaceM2: 3000 }),
      listed({ id: 'b', name: 'Bravo', surfaceM2: 1000 }),
      listed({ id: 'c', name: 'Charlie', surfaceM2: 2000 }),
    ]);
    await render();

    sortBy('surfaceM2');
    await fixture.whenStable();

    expect(names()).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  it('should reverse the order when the same column is sorted again', async () => {
    buildings.set([listed({ id: 'a', name: 'Alpha' }), listed({ id: 'b', name: 'Bravo' })]);
    await render();

    sortBy('name');
    await fixture.whenStable();

    expect(names()).toEqual(['Bravo', 'Alpha']);
  });
});
