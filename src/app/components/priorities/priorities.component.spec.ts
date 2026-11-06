import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonToggle, MatButtonToggleChange } from '@angular/material/button-toggle';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { type Building } from '#models/building.model';
import { type DataProblem } from '#models/data-problem.model';
import { getEvidenceLink } from '#models/finding.model';
import {
  type EstimatedReduction,
  type ImpactAssumptions,
  type ImpactTotals,
  type PriorityRow,
  type PrioritySortKey,
} from '#models/impact.model';
import { PriorityService } from '#services/priority.service';
import { makeBuilding, makeCountry, makeFinding, makeImpact } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { PrioritiesComponent } from './priorities.component';

registerLocaleData(localeFr);

const POLAND = makeCountry({
  code: 'PL',
  name: 'Pologne',
  gridEmissionFactorKgCo2ePerKwh: 0.66,
  electricityPriceEurPerKwh: 0.18,
});

const ASSUMPTIONS: ImpactAssumptions = {
  windowWeeks: 8,
  weeksPerYear: 52,
  annualisationFactor: 6.5,
  earlyStartReferenceLeadHours: 1,
  earlyStartRecoverableShare: 0.5,
  nightHealthyRatio: 0.2,
  nightClosedHoursPerWorkingDay: 12,
  setpointReferenceCelsius: 21,
  setpointEnergySharePerCelsius: 0.07,
  nominalOccupancyPeakRatio: 0.65,
  lowOccupancyRecoverableShare: 0.5,
  countries: [POLAND],
};

const TOTALS: ImpactTotals = {
  annualEnergyKwh: 1_472_859,
  annualCostEur: 373_357,
  annualEmissionsKgCo2e: 595_125,
};

const REDUCTION: EstimatedReduction = {
  baselineEmissionsKgCo2e: 6_354_200,
  identifiedKgCo2e: 595_125,
  reductionPercent: 9.37,
};

function priorityRow(overrides: Partial<PriorityRow> = {}): PriorityRow {
  const finding = makeFinding({ kind: 'weekend-hvac', buildingId: 'bld-warsaw' });
  return {
    rank: 1,
    finding,
    buildingName: 'Varsovie',
    country: POLAND,
    impact: makeImpact({
      findingId: finding.id,
      annualEnergyKwh: 383_126,
      annualCostEur: 68_963,
      annualEmissionsKgCo2e: 252_863,
      confidence: 'high',
    }),
    hasDataQualityIssue: false,
    evidenceLink: getEvidenceLink(finding),
    ...overrides,
  };
}

describe('PrioritiesComponent', () => {
  let fixture: ComponentFixture<PrioritiesComponent>;
  let service: PriorityService;
  let rows: WritableSignal<PriorityRow[]>;
  let totals: WritableSignal<ImpactTotals>;
  let estimatedReduction: WritableSignal<EstimatedReduction>;
  let assumptions: WritableSignal<ImpactAssumptions>;
  let dataQualityBuildings: WritableSignal<Building[]>;
  let sortKey: WritableSignal<PrioritySortKey>;
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
    fixture = TestBed.createComponent(PrioritiesComponent);
    service = TestBed.inject(PriorityService);
    await fixture.whenStable();
  }

  beforeEach(() => {
    rows = signal<PriorityRow[]>([]);
    totals = signal<ImpactTotals>(TOTALS);
    estimatedReduction = signal<EstimatedReduction>(REDUCTION);
    assumptions = signal<ImpactAssumptions>(ASSUMPTIONS);
    dataQualityBuildings = signal<Building[]>([]);
    sortKey = signal<PrioritySortKey>('emissions');
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideServiceMock(PriorityService, {
          rows,
          totals,
          estimatedReduction,
          assumptions,
          dataQualityBuildings,
          sortKey,
          isLoading,
          problem,
        }),
      ],
    });
  });

  it('should show the loading state only', async () => {
    isLoading.set(true);

    await render();

    expect(one('[data-testid="priorities-loading"]')).not.toBeNull();
    expect(one('[data-testid="priorities-table"]')).toBeNull();
    expect(one('[data-testid="priorities-kpis"]')).toBeNull();
  });

  it('should show the French error message and nothing else', async () => {
    problem.set({ type: 'unknown-error', title: 'x' });

    await render();

    expect(text('[data-testid="priorities-error"]')).toBe('Une erreur est survenue. Réessayez plus tard.');
    expect(one('[data-testid="priorities-table"]')).toBeNull();
  });

  it('should show the empty state without ranked waste', async () => {
    await render();

    expect(text('[data-testid="priorities-empty"]')).toBe('Aucun gaspillage chiffré.');
    expect(all('[data-testid="priority-row"]')).toHaveLength(0);
  });

  it('should show the yearly emissions, savings and estimated reduction', async () => {
    await render();

    expect(text('[data-testid="kpi-emissions"]')).toBe('595 tCO₂e/an');
    expect(text('[data-testid="kpi-cost"]')).toBe('373 357 €/an');
    expect(text('[data-testid="kpi-reduction"]')).toBe('−9,4 %');
    expect(text('[data-testid="kpi-reduction-base"]')).toBe('des émissions du parc · base : 6 354 tCO₂e/an');
    expect(text('[data-testid="priorities-summary"]')).toBe(
      'Les gaspillages détectés représentent 595 tCO₂e/an, soit −9,4 % des émissions annuelles du parc.',
    );
  });

  it('should show a 0 % reduction when there is no baseline', async () => {
    estimatedReduction.set({ baselineEmissionsKgCo2e: 0, identifiedKgCo2e: 0, reductionPercent: 0 });

    await render();

    expect(text('[data-testid="kpi-reduction"]')).toBe('−0,0 %');
    expect(text('[data-testid="kpi-reduction-base"]')).toBe('des émissions du parc · base : 0,0 tCO₂e/an');
  });

  it('should mention neither a 30 % target nor an objective', async () => {
    rows.set([priorityRow()]);

    await render();

    const page = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(page).not.toContain('30 %');
    expect(page.toLowerCase()).not.toContain('objectif');
  });

  it('should render a ranked row with its figures, confidence and links', async () => {
    rows.set([priorityRow()]);

    await render();

    expect(text('[data-testid="priority-rank"]')).toBe('1');
    expect(text('[data-testid="priority-building"]')).toBe('Varsovie');
    expect(one('[data-testid="priority-building"]')?.getAttribute('href')).toBe('/buildings/bld-warsaw');
    expect(text('[data-testid="priority-country"]')).toBe('Pologne');
    expect(text('[data-testid="priority-finding-link"]')).toBe('CVC en marche le week-end');
    expect(one('[data-testid="priority-finding-link"]')?.getAttribute('href')).toBe('/findings?building=bld-warsaw');
    expect(text('[data-testid="priority-energy"]')).toBe('383 126 kWh');
    expect(text('[data-testid="priority-cost"]')).toBe('68 963 €');
    expect(text('[data-testid="priority-emissions"]')).toBe('253 tCO₂e');
    expect(text('[data-testid="priority-confidence"]')).toBe('Haute');
    expect(one('[data-testid="priority-evidence-link"]')?.getAttribute('href')).toBe(
      '/equipments/eq-1?metric=hvac-status&period=8-weeks',
    );
    expect(one('[data-testid="priorities-empty"]')).toBeNull();
  });

  it('should render the rows in the service order with their ranks', async () => {
    rows.set([
      priorityRow({ rank: 1, buildingName: 'Varsovie' }),
      priorityRow({ rank: 2, buildingName: 'Munich' }),
    ]);

    await render();

    expect(all('[data-testid="priority-row"]')).toHaveLength(2);
    expect(all('[data-testid="priority-rank"]').map((cell) => cell.textContent?.trim())).toEqual(['1', '2']);
    expect(all('[data-testid="priority-building"]').map((link) => link.textContent?.trim())).toEqual([
      'Varsovie',
      'Munich',
    ]);
  });

  it('should show each confidence level and no evidence link without evidence', async () => {
    rows.set([
      priorityRow({ rank: 1, impact: makeImpact({ confidence: 'medium' }), evidenceLink: null }),
      priorityRow({ rank: 2, impact: makeImpact({ confidence: 'low' }) }),
    ]);

    await render();

    expect(all('[data-testid="priority-confidence"]').map((tag) => tag.textContent?.trim())).toEqual([
      'Moyenne',
      'Faible',
    ]);
    expect(all('[data-testid="priority-evidence-link"]')).toHaveLength(1);
  });

  it('should flag the rows whose figures are to be confirmed', async () => {
    rows.set([
      priorityRow({ rank: 1, hasDataQualityIssue: true }),
      priorityRow({ rank: 2, hasDataQualityIssue: false }),
    ]);

    await render();

    expect(all('[data-testid="priority-to-confirm"]')).toHaveLength(1);
    expect(text('[data-testid="priority-to-confirm"]')).toBe('Chiffres à confirmer');
  });

  it('should not show the data-quality notice without such building', async () => {
    await render();

    expect(one('[data-testid="priorities-data-quality"]')).toBeNull();
  });

  it('should list the buildings with a data-quality issue, each linking to its findings', async () => {
    dataQualityBuildings.set([
      makeBuilding({ id: 'bld-amsterdam', name: 'Amsterdam' }),
      makeBuilding({ id: 'bld-brussels', name: 'Bruxelles' }),
    ]);

    await render();

    const links = all('[data-testid="priorities-data-quality-building"]');
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Amsterdam', 'Bruxelles']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/findings?building=bld-amsterdam',
      '/findings?building=bld-brussels',
    ]);
    expect(text('[data-testid="priorities-data-quality"]')).toContain('Chiffres à confirmer');
  });

  describe('sort toggle', () => {
    it('should select the current sort key', async () => {
      sortKey.set('cost');

      await render();

      const selected = all('mat-button-toggle').filter((toggle) =>
        toggle.classList.contains('mat-button-toggle-checked'),
      );
      expect(selected.map((toggle) => toggle.getAttribute('data-testid'))).toEqual(['priorities-sort-cost']);
    });

    it.each([
      ['cost', 'priorities-sort-cost'],
      ['energy', 'priorities-sort-energy'],
    ] as const)('should ask the service to sort by %s when its toggle is clicked', async (key, testId) => {
      await render();

      one(`[data-testid="${testId}"] button`)?.click();
      await fixture.whenStable();

      expect(service.selectSortKey).toHaveBeenCalledWith(key);
    });

    it('should ignore a value that is not a sort key', async () => {
      await render();
      const toggle = fixture.debugElement.query(By.directive(MatButtonToggle)).injector.get(MatButtonToggle);

      fixture.componentInstance.onSelectSortKey(new MatButtonToggleChange(toggle, 'size'));
      fixture.componentInstance.onSelectSortKey(new MatButtonToggleChange(toggle, null));

      expect(service.selectSortKey).not.toHaveBeenCalled();
    });
  });

  describe('method block', () => {
    it('should state the early HVAC start share (0,5) and its medium confidence', async () => {
      await render();

      const method = text('[data-testid="method-early-hvac-start"]');
      expect(method).toContain('× 0,5');
      expect(method).toContain('1 h avant');
      expect(method).toContain('Confiance moyenne');
    });

    it('should state the other rules with their assumptions', async () => {
      await render();

      expect(text('[data-testid="method-night-baseload"]')).toContain('0,2 × puissance de jour');
      expect(text('[data-testid="method-night-baseload"]')).toContain('12 h hors ouverture');
      expect(text('[data-testid="method-heating-setpoint"]')).toContain('7 % par °C au-dessus de 21 °C');
      expect(text('[data-testid="method-low-occupancy"]')).toContain('65 %');
      expect(text('[data-testid="method-low-occupancy"]')).toContain('Confiance faible');
      expect(text('[data-testid="method-weekend-hvac"]')).toContain('Confiance haute');
    });

    it('should explain the annualisation', async () => {
      await render();

      expect(text('[data-testid="method-annualisation"]')).toContain('8 semaines × 52 / 8, soit × 6,5');
    });

    it('should list the factor and price of each country', async () => {
      await render();

      expect(all('[data-testid="method-country"]').map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Pologne : 0,66 kgCO₂e/kWh, 0,18 €/kWh',
      ]);
    });

    it('should explain the estimated reduction with the identified and baseline emissions', async () => {
      await render();

      const method = text('[data-testid="method-reduction"]');
      expect(method).toContain('tCO₂e évitables / émissions annuelles de référence');
      expect(method).toContain('soit 595 tCO₂e/an sur 6 354 tCO₂e/an');
    });
  });
});
