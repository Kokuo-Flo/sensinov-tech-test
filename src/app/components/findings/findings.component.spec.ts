import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { type DataProblem } from '#models/data-problem.model';
import { getEvidenceLink } from '#models/finding.model';
import { makeFinding } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { FindingsComponent } from './findings.component';
import { FindingsService } from './findings.service';

registerLocaleData(localeFr);

type WasteRow = ReturnType<FindingsService['wasteRows']>[number];
type DataQualityRow = ReturnType<FindingsService['dataQualityRows']>[number];
type BuildingFilter = ReturnType<FindingsService['buildingFilter']>;

function wasteRow(overrides: Partial<WasteRow> = {}): WasteRow {
  const finding = makeFinding({
    kind: 'weekend-hvac',
    buildingId: 'bld-warsaw',
    observed: 16,
    reference: 16,
    firstSeenAt: '2026-09-11T23:00:00.000Z',
    lastSeenAt: '2026-11-01T22:45:00.000Z',
  });
  return {
    ...finding,
    buildingName: 'Varsovie',
    evidenceLink: getEvidenceLink(finding),
    isFlaggedByAnalyst: true,
    ...overrides,
  };
}

function dataQualityRow(overrides: Partial<DataQualityRow> = {}): DataQualityRow {
  const finding = makeFinding({
    kind: 'frozen-sensor',
    buildingId: 'bld-amsterdam',
    observed: 120,
    reference: 24,
    unit: 'h',
    firstSeenAt: '2026-10-11T23:00:00.000Z',
    lastSeenAt: '2026-10-16T22:45:00.000Z',
    evidence: [{ equipmentId: 'eq-temp', metric: 'indoor-temperature' }],
    excessEnergyKwh: null,
  });
  return {
    ...finding,
    buildingName: 'Amsterdam',
    evidenceLink: getEvidenceLink(finding),
    equipmentName: 'Sonde nord',
    ...overrides,
  };
}

describe('FindingsComponent', () => {
  let fixture: ComponentFixture<FindingsComponent>;
  let wasteRows: WritableSignal<WasteRow[]>;
  let dataQualityRows: WritableSignal<DataQualityRow[]>;
  let buildingFilter: WritableSignal<BuildingFilter>;
  let isLoading: WritableSignal<boolean>;
  let problem: WritableSignal<DataProblem | null>;

  function all(selector: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector));
  }

  function one(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }

  function text(selector: string): string | undefined {
    return one(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(FindingsComponent);
    await fixture.whenStable();
  }

  beforeEach(() => {
    wasteRows = signal<WasteRow[]>([]);
    dataQualityRows = signal<DataQualityRow[]>([]);
    buildingFilter = signal<BuildingFilter>(null);
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'fr-FR' }],
    });
    TestBed.overrideComponent(FindingsComponent, {
      set: {
        providers: [
          provideServiceMock(FindingsService, {
            wasteRows,
            dataQualityRows,
            buildingFilter,
            isLoading,
            problem,
          }),
        ],
      },
    });
  });

  it('should hand its building query parameter to the service', async () => {
    fixture = TestBed.createComponent(FindingsComponent);
    fixture.componentRef.setInput('building', 'bld-lyon');
    const service = fixture.debugElement.injector.get(FindingsService);
    await fixture.whenStable();

    const [buildingId] = vi.mocked(service.connect).mock.calls[0] ?? [];
    expect(buildingId?.()).toBe('bld-lyon');
  });

  it('should show the loading state only', async () => {
    isLoading.set(true);

    await render();

    expect(one('[data-testid="findings-loading"]')).not.toBeNull();
    expect(one('[data-testid="waste-table"]')).toBeNull();
    expect(one('[data-testid="findings-error"]')).toBeNull();
  });

  it('should show the French error message and no table', async () => {
    problem.set({ type: 'unknown-error', title: 'x' });

    await render();

    expect(text('[data-testid="findings-error"]')).toBe('Une erreur est survenue. Réessayez plus tard.');
    expect(one('[data-testid="waste-table"]')).toBeNull();
    expect(one('[data-testid="data-quality-table"]')).toBeNull();
  });

  it('should show both empty states when nothing was detected', async () => {
    await render();

    expect(text('[data-testid="waste-empty"]')).toBe('Aucun gaspillage détecté.');
    expect(text('[data-testid="data-quality-empty"]')).toBe('Aucun défaut de données détecté.');
    expect(all('[data-testid="waste-row"]')).toHaveLength(0);
  });

  it('should render a waste row with its building link, label, statement and period', async () => {
    wasteRows.set([wasteRow()]);

    await render();

    expect(one('[data-testid="waste-building"]')?.getAttribute('href')).toBe('/buildings/bld-warsaw');
    expect(text('[data-testid="waste-building"]')).toBe('Varsovie');
    expect(text('[data-testid="waste-kind"]')).toBe('CVC en marche le week-end');
    expect(text('[data-testid="waste-statement"]')).toBe(
      'CVC en marche 16 jours de week-end sur 16, occupation quasi nulle',
    );
    expect(text('[data-testid="waste-period"]')).toMatch(/^12\/09\/2026 → 01\/11\/2026/);
    expect(one('[data-testid="waste-empty"]')).toBeNull();
  });

  it('should show the occurrence count with the right plural in the waste table only', async () => {
    wasteRows.set([
      wasteRow({ id: 'a', occurrences: 40 }),
      wasteRow({ id: 'b', occurrences: 1 }),
    ]);
    dataQualityRows.set([dataQualityRow()]);

    await render();

    const counts = all('[data-testid="waste-occurrences"]').map((element) => element.textContent.trim());
    expect(counts).toEqual(['· 40 jours', '· 1 jour']);
  });

  it('should show whether the analyst reported the waste', async () => {
    wasteRows.set([
      wasteRow({ id: 'a', isFlaggedByAnalyst: true }),
      wasteRow({ id: 'b', kind: 'night-baseload', isFlaggedByAnalyst: false }),
    ]);

    await render();

    expect(all('[data-testid="waste-analyst"]').map((tag) => tag.textContent?.trim())).toEqual(['Oui', 'Non']);
  });

  it('should link the evidence to the equipment page on the metric and the 8-week period', async () => {
    wasteRows.set([wasteRow()]);

    await render();

    const link = one('[data-testid="waste-evidence-link"]');
    expect(link?.textContent?.trim()).toBe('Voir les mesures');
    expect(link?.getAttribute('href')).toBe('/equipments/eq-1?metric=hvac-status&period=8-weeks');
  });

  it('should render no evidence link for a finding without evidence', async () => {
    wasteRows.set([wasteRow({ evidence: [], evidenceLink: null })]);

    await render();

    expect(one('[data-testid="waste-evidence-link"]')).toBeNull();
  });

  it('should render a data-quality row with the faulty sensor, defect, statement and period', async () => {
    dataQualityRows.set([dataQualityRow()]);

    await render();

    expect(text('[data-testid="data-quality-building"]')).toBe('Amsterdam');
    expect(one('[data-testid="data-quality-building"]')?.getAttribute('href')).toBe('/buildings/bld-amsterdam');
    expect(text('[data-testid="data-quality-equipment"]')).toBe('Sonde nord');
    expect(one('[data-testid="data-quality-equipment"]')?.getAttribute('href')).toBe(
      '/equipments/eq-temp?metric=indoor-temperature&period=8-weeks',
    );
    expect(text('[data-testid="data-quality-kind"]')).toBe('Capteur figé');
    expect(text('[data-testid="data-quality-statement"]')).toBe("Valeur identique pendant 120 h d'affilée (seuil 24 h)");
    expect(text('[data-testid="data-quality-period"]')).toBe('12/10/2026 00:00 → 16/10/2026 23:45');
    expect(one('[data-testid="data-quality-empty"]')).toBeNull();
  });

  it('should show the equipment name without link when the finding has no evidence', async () => {
    dataQualityRows.set([dataQualityRow({ evidence: [], evidenceLink: null })]);

    await render();

    expect(text('[data-testid="data-quality-equipment"]')).toBe('Sonde nord');
    expect(one('[data-testid="data-quality-equipment"]')?.getAttribute('href')).toBeNull();
  });

  it('should not show the building filter for the whole portfolio', async () => {
    await render();

    expect(one('[data-testid="findings-filter"]')).toBeNull();
  });

  it('should show the filtered building with a link back to the whole portfolio', async () => {
    buildingFilter.set({ id: 'bld-warsaw', name: 'Varsovie' });

    await render();

    expect(text('[data-testid="findings-filter-building"]')).toBe('Varsovie');
    expect(one('[data-testid="findings-filter-clear"]')?.getAttribute('href')).toBe('/findings');
  });
});
