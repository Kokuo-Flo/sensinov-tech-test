import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSort } from '@angular/material/sort';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { type DataProblem } from '#models/data-problem.model';
import { type Building } from '#models/building.model';
import { type Equipment } from '#models/equipment.model';
import { makeBuilding, makeEquipment } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { BuildingDetailComponent } from './building-detail.component';
import { BuildingDetailService } from './building-detail.service';

registerLocaleData(localeFr);

describe('BuildingDetailComponent', () => {
  let fixture: ComponentFixture<BuildingDetailComponent>;
  let building: WritableSignal<Building | null>;
  let equipments: WritableSignal<Equipment[]>;
  let findingCount: WritableSignal<number | null>;
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
    return all('[data-testid="equipment-link"]').map((link) => link.textContent?.trim());
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(BuildingDetailComponent);
    fixture.componentRef.setInput('buildingId', 'bld-warsaw');
    await fixture.whenStable();
  }

  beforeEach(() => {
    building = signal<Building | null>(null);
    equipments = signal<Equipment[]>([]);
    findingCount = signal<number | null>(null);
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'fr-FR' }],
    });
    TestBed.overrideComponent(BuildingDetailComponent, {
      set: {
        providers: [
          provideServiceMock(BuildingDetailService, {
            building,
            equipments,
            findingCount,
            isLoading,
            problem,
          }),
        ],
      },
    });
  });

  it('should hand its route input to the service', async () => {
    await render();

    const service = fixture.debugElement.injector.get(BuildingDetailService);
    const [buildingId] = vi.mocked(service.connect).mock.calls[0] ?? [];
    expect(buildingId?.()).toBe('bld-warsaw');
  });

  it('should show the loading state only', async () => {
    isLoading.set(true);

    await render();

    expect(one('[data-testid="building-detail-loading"]')).not.toBeNull();
    expect(one('[data-testid="building-name"]')).toBeNull();
  });

  it('should show « Bâtiment introuvable. » on a not-found problem', async () => {
    problem.set({ type: 'not-found', title: 'x' });

    await render();

    expect(one('[data-testid="building-detail-error"]')?.textContent?.trim()).toBe(
      'Bâtiment introuvable.',
    );
    expect(one('[data-testid="building-name"]')).toBeNull();
  });

  it('should link to the findings of the building with the singular label for one finding', async () => {
    building.set(makeBuilding());
    findingCount.set(1);

    await render();

    const link = one('[data-testid="building-findings-link"]');
    expect(link?.textContent?.trim()).toBe('1 anomalie détectée');
    expect(link?.getAttribute('href')).toBe('/findings?building=bld-warsaw');
    expect(one('[data-testid="building-findings-none"]')).toBeNull();
  });

  it('should use the plural label from two findings', async () => {
    building.set(makeBuilding());
    findingCount.set(3);

    await render();

    expect(one('[data-testid="building-findings-link"]')?.textContent?.trim()).toBe('3 anomalies détectées');
  });

  it('should say no finding was detected when the count is 0', async () => {
    building.set(makeBuilding());
    findingCount.set(0);

    await render();

    expect(one('[data-testid="building-findings-none"]')?.textContent?.trim()).toBe('Aucune anomalie détectée.');
    expect(one('[data-testid="building-findings-link"]')).toBeNull();
  });

  it('should show nothing about findings while the detection runs or failed (count unknown)', async () => {
    building.set(makeBuilding());
    findingCount.set(null);

    await render();

    expect(one('[data-testid="building-findings-link"]')).toBeNull();
    expect(one('[data-testid="building-findings-none"]')).toBeNull();
  });

  it('should show the generic French message on another problem', async () => {
    problem.set({ type: 'unknown-error', title: 'x' });

    await render();

    expect(one('[data-testid="building-detail-error"]')?.textContent?.trim()).toBe(
      'Une erreur est survenue. Réessayez plus tard.',
    );
  });

  it('should render the building summary', async () => {
    building.set(
      makeBuilding({
        name: 'Varsovie HQ',
        city: 'Varsovie',
        surfaceM2: 12500,
        constructionYear: 1998,
        floors: 6,
      }),
    );

    await render();

    expect(one('[data-testid="building-name"]')?.textContent?.trim()).toBe('Varsovie HQ');
    expect(one('[data-testid="building-city"]')?.textContent?.trim()).toBe('Varsovie');
    expect(one('[data-testid="building-surface"]')?.textContent?.replace(/\s/g, ' ')).toBe(
      '12 500 m²',
    );
    expect(one('[data-testid="building-year"]')?.textContent?.trim()).toBe('1998');
    expect(one('[data-testid="building-floors"]')?.textContent?.trim()).toBe('6');
  });

  it('should render a breadcrumb back to the list ending on the building', async () => {
    building.set(makeBuilding({ name: 'Varsovie HQ' }));

    await render();

    expect(one('[data-testid="breadcrumb-buildings"]')?.getAttribute('href')).toBe('/buildings');
    expect(one('[data-testid="breadcrumb-building"]')?.textContent?.trim()).toBe('Varsovie HQ');
  });

  it('should only render the root breadcrumb while the building is unknown', async () => {
    await render();

    expect(one('[data-testid="breadcrumb-buildings"]')).not.toBeNull();
    expect(one('[data-testid="breadcrumb-building"]')).toBeNull();
  });

  it('should show the empty equipment state', async () => {
    building.set(makeBuilding());

    await render();

    expect(one('[data-testid="equipment-list-empty"]')?.textContent?.trim()).toBe(
      'Aucun équipement.',
    );
  });

  it('should render an equipment row with link, labels and dashes for missing values', async () => {
    building.set(makeBuilding());
    equipments.set([
      makeEquipment({
        id: 'eq-9',
        name: 'AHU_North',
        type: 'hvac-unit',
        meterScope: null,
        zone: null,
        vendor: 'Acme',
        samplingIntervalMinutes: 60,
      }),
    ]);

    await render();

    const link = one('[data-testid="equipment-link"]');
    expect(link?.textContent?.trim()).toBe('AHU_North');
    expect(link?.getAttribute('href')).toBe('/equipments/eq-9');
    expect(one('[data-testid="equipment-type"]')?.textContent?.trim()).toBe(
      "Centrale de traitement d'air",
    );
    expect(one('[data-testid="equipment-scope"]')?.textContent?.trim()).toBe('—');
    expect(one('[data-testid="equipment-zone"]')?.textContent?.trim()).toBe('—');
    expect(one('[data-testid="equipment-vendor"]')?.textContent?.trim()).toBe('Acme');
    expect(one('[data-testid="equipment-interval"]')?.textContent?.trim()).toBe('60 min');
  });

  it('should render the meter scope label of an energy meter', async () => {
    building.set(makeBuilding());
    equipments.set([makeEquipment({ meterScope: 'lighting-plugs' })]);

    await render();

    expect(one('[data-testid="equipment-scope"]')?.textContent?.trim()).toBe('Éclairage & prises');
  });

  it('should sort equipments by name ascending, then reorder on column sort', async () => {
    building.set(makeBuilding());
    equipments.set([
      makeEquipment({ id: 'z', name: 'Zeta', vendor: 'Acme' }),
      makeEquipment({ id: 'a', name: 'Alpha', vendor: 'Zenith' }),
    ]);
    await render();
    expect(names()).toEqual(['Alpha', 'Zeta']);

    fixture.debugElement
      .query(By.directive(MatSort))
      .injector.get(MatSort)
      .sort({ id: 'vendor', start: 'asc', disableClear: false });
    await fixture.whenStable();

    expect(names()).toEqual(['Zeta', 'Alpha']);
  });

  it('should put equipments without zone last when sorting by zone', async () => {
    building.set(makeBuilding());
    equipments.set([
      makeEquipment({ id: 'n', name: 'Nozone', zone: null }),
      makeEquipment({ id: 'b', name: 'Bzone', zone: 'B' }),
      makeEquipment({ id: 'a', name: 'Azone', zone: 'A' }),
    ]);
    await render();

    const sort = fixture.debugElement.query(By.directive(MatSort)).injector.get(MatSort);
    sort.sort({ id: 'zone', start: 'asc', disableClear: false });
    await fixture.whenStable();
    expect(names()).toEqual(['Azone', 'Bzone', 'Nozone']);

    sort.sort({ id: 'zone', start: 'asc', disableClear: false });
    await fixture.whenStable();

    expect(names()).toEqual(['Bzone', 'Azone', 'Nozone']);
  });
});
