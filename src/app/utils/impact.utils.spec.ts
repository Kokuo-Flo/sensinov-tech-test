import { BUILDINGS } from '#data/building.data';
import { COUNTRIES } from '#data/country.data';
import { type Building } from '#models/building.model';
import { type Country } from '#models/country.model';
import { type Finding } from '#models/finding.model';
import { type ImpactEstimate } from '#models/impact.model';
import { getMeasurementPeriodRange } from '#models/measurement-period.model';
import { makeBuilding, makeCountry, makeFinding, makeImpact } from '#testing/fixtures';
import { realDetectionInputs } from '#testing/detection';
import { detectBuildingFindings } from '#utils/detection/detect-findings.utils';

import {
  estimateImpact,
  getAnnualisationFactor,
  getEstimatedReduction,
  getImpactConfidence,
  getImpactValue,
  getWindowWeeks,
  sortByImpact,
  sumImpacts,
} from './impact.utils';

describe('getWindowWeeks', () => {
  it('should measure the 8-week period as 8 weeks', () => {
    expect(getWindowWeeks(getMeasurementPeriodRange('8-weeks'))).toBe(8);
  });

  it('should return 0 for an empty or inverted range', () => {
    expect(getWindowWeeks({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' })).toBe(0);
    expect(getWindowWeeks({ from: '2026-10-08T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' })).toBe(0);
  });
});

describe('getAnnualisationFactor', () => {
  it('should scale 8 weeks to 52 (6.5)', () => {
    expect(getAnnualisationFactor(8)).toBe(6.5);
  });

  it('should return 0 for an empty or negative window', () => {
    expect(getAnnualisationFactor(0)).toBe(0);
    expect(getAnnualisationFactor(-2)).toBe(0);
  });
});

describe('getImpactConfidence', () => {
  it.each([
    ['weekend-hvac', 'high'],
    ['early-hvac-start', 'medium'],
    ['night-baseload', 'medium'],
    ['heating-setpoint', 'medium'],
    ['low-occupancy', 'low'],
    ['frozen-sensor', null],
    ['missing-data', null],
  ] as const)('should rate %s as %s', (kind, confidence) => {
    expect(getImpactConfidence(kind)).toBe(confidence);
  });
});

describe('estimateImpact', () => {
  const country = makeCountry({ gridEmissionFactorKgCo2ePerKwh: 0.5, electricityPriceEurPerKwh: 0.2 });

  it('should annualise the excess and price it in € and kgCO₂e', () => {
    const finding = makeFinding({ kind: 'night-baseload', excessEnergyKwh: 100 });

    expect(estimateImpact(finding, country, 6.5)).toEqual({
      findingId: 'night-baseload:bld-warsaw',
      annualEnergyKwh: 650,
      annualCostEur: 130,
      annualEmissionsKgCo2e: 325,
      confidence: 'medium',
    });
  });

  it('should return null when the finding has no excess energy', () => {
    expect(estimateImpact(makeFinding({ excessEnergyKwh: null }), country, 6.5)).toBeNull();
  });

  it('should return null for a data-quality finding even with an excess', () => {
    expect(estimateImpact(makeFinding({ kind: 'frozen-sensor', excessEnergyKwh: 50 }), country, 6.5)).toBeNull();
  });

  it('should yield zeros with a null annualisation factor (empty window)', () => {
    expect(estimateImpact(makeFinding(), country, 0)).toMatchObject({
      annualEnergyKwh: 0,
      annualCostEur: 0,
      annualEmissionsKgCo2e: 0,
    });
  });
});

describe('sumImpacts', () => {
  it('should sum energy, cost and emissions', () => {
    const totals = sumImpacts([
      makeImpact({ annualEnergyKwh: 1, annualCostEur: 2, annualEmissionsKgCo2e: 3 }),
      makeImpact({ annualEnergyKwh: 10, annualCostEur: 20, annualEmissionsKgCo2e: 30 }),
    ]);

    expect(totals).toEqual({ annualEnergyKwh: 11, annualCostEur: 22, annualEmissionsKgCo2e: 33 });
  });

  it('should return zeros for no estimate', () => {
    expect(sumImpacts([])).toEqual({ annualEnergyKwh: 0, annualCostEur: 0, annualEmissionsKgCo2e: 0 });
  });
});

describe('getEstimatedReduction', () => {
  const countries = [makeCountry({ code: 'PL', gridEmissionFactorKgCo2ePerKwh: 0.5 })];
  const buildings = [
    makeBuilding({ id: 'a', countryCode: 'PL', baselineAnnualEnergyKwh: 1000 }),
    makeBuilding({ id: 'b', countryCode: 'PL', baselineAnnualEnergyKwh: 3000 }),
  ];

  it('should relate the identified emissions to the baseline emissions', () => {
    const reduction = getEstimatedReduction(buildings, countries, [makeImpact({ annualEmissionsKgCo2e: 300 })]);

    expect(reduction).toEqual({ baselineEmissionsKgCo2e: 2000, identifiedKgCo2e: 300, reductionPercent: 15 });
  });

  it('should return 0 % when the baseline is 0', () => {
    const reduction = getEstimatedReduction([], countries, [makeImpact({ annualEmissionsKgCo2e: 300 })]);

    expect(reduction).toEqual({ baselineEmissionsKgCo2e: 0, identifiedKgCo2e: 300, reductionPercent: 0 });
  });

  it('should leave a building of unknown country out of the baseline', () => {
    const reduction = getEstimatedReduction(
      [...buildings, makeBuilding({ id: 'c', countryCode: 'DE', baselineAnnualEnergyKwh: 99_999 })],
      countries,
      [],
    );

    expect(reduction.baselineEmissionsKgCo2e).toBe(2000);
    expect(reduction.reductionPercent).toBe(0);
  });

  it('should compute the baseline of the real dataset', () => {
    const reduction = getEstimatedReduction(BUILDINGS, COUNTRIES, []);

    expect(reduction.baselineEmissionsKgCo2e).toBeCloseTo(6_354_200, 0);
  });
});

describe('sortByImpact', () => {
  const rowOf = (id: string, energy: number, cost: number, emissions: number) => ({
    id,
    impact: makeImpact({
      findingId: id,
      annualEnergyKwh: energy,
      annualCostEur: cost,
      annualEmissionsKgCo2e: emissions,
    }),
  });
  const rows = [rowOf('a', 10, 300, 5), rowOf('b', 30, 100, 20), rowOf('c', 20, 200, 10)];

  it.each([
    ['emissions', ['b', 'c', 'a']],
    ['cost', ['a', 'c', 'b']],
    ['energy', ['b', 'c', 'a']],
  ] as const)('should rank by %s, largest first', (key, expected) => {
    expect(sortByImpact(rows, key).map((row) => row.id)).toEqual(expected);
  });

  it('should break ties by finding id', () => {
    const tied = [rowOf('z', 1, 1, 7), rowOf('m', 1, 1, 7), rowOf('a', 1, 1, 7)];

    expect(sortByImpact(tied, 'emissions').map((row) => row.id)).toEqual(['a', 'm', 'z']);
  });

  it('should not mutate its input', () => {
    const input = [...rows];

    sortByImpact(input, 'cost');

    expect(input.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('should read the value ranked by each key', () => {
    const impact: ImpactEstimate = makeImpact({ annualEnergyKwh: 1, annualCostEur: 2, annualEmissionsKgCo2e: 3 });

    expect(getImpactValue(impact, 'energy')).toBe(1);
    expect(getImpactValue(impact, 'cost')).toBe(2);
    expect(getImpactValue(impact, 'emissions')).toBe(3);
  });
});

describe('impact of the generated dataset', () => {
  const factor = getAnnualisationFactor(getWindowWeeks(getMeasurementPeriodRange('8-weeks')));
  const rows = realDetectionInputs().flatMap((input) =>
    detectBuildingFindings(input).flatMap((finding: Finding) => {
      const building = BUILDINGS.find((candidate: Building) => candidate.id === finding.buildingId);
      const country = COUNTRIES.find((candidate: Country) => candidate.code === building?.countryCode);
      const impact = country === undefined ? null : estimateImpact(finding, country, factor);
      return impact === null ? [] : [{ buildingId: finding.buildingId, impact }];
    }),
  );
  const impacts = rows.map((row) => row.impact);

  it('should total about 1.47 GWh, 373 k€ and 595 tCO₂e a year', () => {
    const totals = sumImpacts(impacts);

    expect(totals.annualEnergyKwh).toBeCloseTo(1_472_859, -2);
    expect(totals.annualCostEur).toBeCloseTo(373_357, -2);
    expect(totals.annualEmissionsKgCo2e).toBeCloseTo(595_125, -2);
  });

  it('should estimate a 9.4 % reduction of the portfolio emissions', () => {
    const reduction = getEstimatedReduction(BUILDINGS, COUNTRIES, impacts);

    expect(reduction.identifiedKgCo2e).toBeCloseTo(595_125, -2);
    expect(reduction.reductionPercent).toBeCloseTo(9.37, 1);
  });

  it('should rank by emissions: Warsaw, Munich, Berlin, Madrid, Lyon', () => {
    expect(sortByImpact(rows, 'emissions').map((row) => row.buildingId)).toEqual([
      'bld-warsaw', 'bld-munich', 'bld-berlin', 'bld-madrid', 'bld-lyon',
    ]);
  });

  it('should rank by energy: Munich, Warsaw, Berlin, Madrid, Lyon', () => {
    expect(sortByImpact(rows, 'energy').map((row) => row.buildingId)).toEqual([
      'bld-munich', 'bld-warsaw', 'bld-berlin', 'bld-madrid', 'bld-lyon',
    ]);
  });
});
