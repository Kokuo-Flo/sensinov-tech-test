import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Observable, NEVER, of, throwError } from 'rxjs';

import { ReferenceDao } from '#dao/reference.dao';
import { type Building } from '#models/building.model';
import { type Country } from '#models/country.model';
import { type DataProblem } from '#models/data-problem.model';
import { type Finding } from '#models/finding.model';
import { FindingService } from '#services/finding.service';
import { makeBuilding, makeCountry, makeFinding } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { settle } from '#testing/settle';

import { PriorityService } from './priority.service';

const POLAND = makeCountry({
  code: 'PL',
  name: 'Pologne',
  gridEmissionFactorKgCo2ePerKwh: 0.5,
  electricityPriceEurPerKwh: 0.1,
});
const GERMANY = makeCountry({
  code: 'DE',
  name: 'Allemagne',
  gridEmissionFactorKgCo2ePerKwh: 0.1,
  electricityPriceEurPerKwh: 0.3,
});

const WARSAW = makeBuilding({ id: 'bld-warsaw', name: 'Varsovie', countryCode: 'PL', baselineAnnualEnergyKwh: 10_000 });
const BERLIN = makeBuilding({ id: 'bld-berlin', name: 'Berlin', countryCode: 'DE', baselineAnnualEnergyKwh: 20_000 });
const LYON = makeBuilding({ id: 'bld-lyon', name: 'Lyon', countryCode: 'FR', baselineAnnualEnergyKwh: 5_000 });

/** Annualised (× 6.5): Warsaw 6 500 kWh / 3 250 kg / 650 €, Berlin 13 000 kWh / 1 300 kg / 3 900 €. */
const WARSAW_WEEKEND = makeFinding({ kind: 'weekend-hvac', buildingId: 'bld-warsaw', excessEnergyKwh: 1000 });
const BERLIN_EARLY = makeFinding({ kind: 'early-hvac-start', buildingId: 'bld-berlin', excessEnergyKwh: 2000 });
const WARSAW_FROZEN = makeFinding({
  kind: 'frozen-sensor',
  buildingId: 'bld-warsaw',
  id: 'frozen-sensor:bld-warsaw:eq-1',
  excessEnergyKwh: null,
});

interface Setup {
  readonly findings?: Finding[];
  readonly buildings?: Building[];
  readonly findingsLoading?: boolean;
  readonly findingProblem?: DataProblem | null;
  readonly countries?: Observable<Country[]>;
}

function setup(options: Setup = {}): PriorityService {
  TestBed.configureTestingModule({
    providers: [
      provideServiceMock(FindingService, {
        findings: signal(options.findings ?? [WARSAW_WEEKEND, BERLIN_EARLY, WARSAW_FROZEN]),
        buildings: signal(options.buildings ?? [WARSAW, BERLIN, LYON]),
        isLoading: signal(options.findingsLoading ?? false),
        problem: signal(options.findingProblem ?? null),
      }),
      provideServiceMock(ReferenceDao, {
        getCountries: () => options.countries ?? of([POLAND, GERMANY]),
      }),
    ],
  });
  return TestBed.inject(PriorityService);
}

describe('PriorityService', () => {
  it('should rank the quantified wastes by emissions by default, 1-based', async () => {
    const service = setup();

    await settle();

    expect(service.sortKey()).toBe('emissions');
    expect(service.rows().map((row) => [row.rank, row.finding.id])).toEqual([
      [1, 'weekend-hvac:bld-warsaw'],
      [2, 'early-hvac-start:bld-berlin'],
    ]);
  });

  it('should re-rank when the sort key changes', async () => {
    const service = setup();
    await settle();

    service.selectSortKey('cost');

    expect(service.sortKey()).toBe('cost');
    expect(service.rows().map((row) => [row.rank, row.finding.id])).toEqual([
      [1, 'early-hvac-start:bld-berlin'],
      [2, 'weekend-hvac:bld-warsaw'],
    ]);

    service.selectSortKey('energy');

    expect(service.rows().map((row) => row.finding.id)).toEqual([
      'early-hvac-start:bld-berlin',
      'weekend-hvac:bld-warsaw',
    ]);
  });

  it('should annualise and price each row with its building country', async () => {
    const service = setup();

    await settle();

    const warsaw = service.rows().find((row) => row.finding.buildingId === 'bld-warsaw');
    expect(warsaw).toMatchObject({
      buildingName: 'Varsovie',
      country: POLAND,
      impact: {
        annualEnergyKwh: 6500,
        annualCostEur: 650,
        annualEmissionsKgCo2e: 3250,
        confidence: 'high',
      },
      evidenceLink: { commands: ['/equipments', 'eq-1'], queryParams: { metric: 'hvac-status', period: '8-weeks' } },
    });
    expect(service.totals()).toEqual({
      annualEnergyKwh: 19_500,
      annualCostEur: 4550,
      annualEmissionsKgCo2e: 4550,
    });
  });

  it('should flag the rows of a building that also has a data-quality finding', async () => {
    const service = setup();

    await settle();

    expect(service.rows().map((row) => [row.finding.buildingId, row.hasDataQualityIssue])).toEqual([
      ['bld-warsaw', true],
      ['bld-berlin', false],
    ]);
    expect(service.dataQualityBuildings().map((building) => building.id)).toEqual(['bld-warsaw']);
  });

  it('should list data-quality buildings by name', async () => {
    const service = setup({
      findings: [
        makeFinding({ kind: 'missing-data', buildingId: 'bld-warsaw', id: 'a', excessEnergyKwh: null }),
        makeFinding({ kind: 'missing-data', buildingId: 'bld-berlin', id: 'b', excessEnergyKwh: null }),
      ],
    });

    await settle();

    expect(service.dataQualityBuildings().map((building) => building.name)).toEqual(['Berlin', 'Varsovie']);
    expect(service.rows()).toEqual([]);
  });

  it('should leave out a finding without excess energy, of unknown country or of unknown building', async () => {
    const service = setup({
      findings: [
        makeFinding({ kind: 'night-baseload', buildingId: 'bld-warsaw', excessEnergyKwh: null }),
        makeFinding({ kind: 'weekend-hvac', buildingId: 'bld-lyon', excessEnergyKwh: 500 }),
        makeFinding({ kind: 'weekend-hvac', buildingId: 'bld-ghost', excessEnergyKwh: 500 }),
        BERLIN_EARLY,
      ],
    });

    await settle();

    expect(service.rows().map((row) => row.finding.id)).toEqual(['early-hvac-start:bld-berlin']);
  });

  it('should have no row and zero totals without finding', async () => {
    const service = setup({ findings: [] });

    await settle();

    expect(service.rows()).toEqual([]);
    expect(service.totals()).toEqual({ annualEnergyKwh: 0, annualCostEur: 0, annualEmissionsKgCo2e: 0 });
    expect(service.problem()).toBeNull();
  });

  it('should relate the identified emissions to the baseline emissions of the portfolio', async () => {
    const service = setup();

    await settle();

    // baseline: 10 000 × 0.5 + 20 000 × 0.1 + 5 000 × 0 (FR unknown) = 7 000 kg; identified 4 550 kg
    expect(service.estimatedReduction()).toEqual({
      baselineEmissionsKgCo2e: 7000,
      identifiedKgCo2e: 4550,
      reductionPercent: 65,
    });
  });

  it('should estimate a 0 % reduction without building or with unknown countries only', async () => {
    const service = setup({ buildings: [] });
    await settle();

    expect(service.estimatedReduction()).toEqual({
      baselineEmissionsKgCo2e: 0,
      identifiedKgCo2e: 0,
      reductionPercent: 0,
    });
    TestBed.resetTestingModule();

    const unknown = setup({ buildings: [LYON], findings: [] });
    await settle();

    expect(unknown.estimatedReduction().baselineEmissionsKgCo2e).toBe(0);
    expect(unknown.estimatedReduction().reductionPercent).toBe(0);
  });

  it('should expose every assumption behind the figures', async () => {
    const service = setup();

    await settle();

    expect(service.assumptions()).toEqual({
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
      countries: [GERMANY, POLAND],
    });
  });

  it('should only list the countries of the ranked buildings', async () => {
    const service = setup({ findings: [WARSAW_WEEKEND] });

    await settle();

    expect(service.assumptions().countries).toEqual([POLAND]);
  });

  it('should be loading while the findings or the reference data are pending', async () => {
    expect(setup({ findingsLoading: true }).isLoading()).toBe(true);
    TestBed.resetTestingModule();

    const service = setup({ countries: NEVER });
    await settle();

    expect(service.isLoading()).toBe(true);
    expect(service.rows()).toEqual([]);
  });

  it('should not be loading once everything is loaded', async () => {
    const service = setup();

    await settle();

    expect(service.isLoading()).toBe(false);
  });

  it('should relay the problem of the findings first', async () => {
    const problem: DataProblem = { type: 'not-found', title: 'Equipment not found' };
    const service = setup({ findingProblem: problem, countries: throwError(() => new Error('down')) });

    await settle();

    expect(service.problem()).toBe(problem);
  });

  it('should expose a problem when the countries cannot be loaded', async () => {
    const service = setup({ countries: throwError(() => new Error('countries down')) });

    await settle();

    expect(service.problem()).toEqual({ type: 'unknown-error', title: 'Unknown error', detail: 'countries down' });
  });
});
