import { type Building } from '#models/building.model';
import { type Country, type CountryCode } from '#models/country.model';
import { type Finding, type FindingKind } from '#models/finding.model';
import {
  type Confidence,
  type EstimatedReduction,
  type ImpactEstimate,
  type ImpactTotals,
  type PrioritySortKey,
} from '#models/impact.model';
import { type MeasurementRange } from '#models/measurement-period.model';

/** Linear extrapolation base: no seasonal model, shown as such to the user. */
export const WEEKS_PER_YEAR = 52;
const MS_PER_WEEK = 7 * 86_400_000;
const PERCENT = 100;

/** Length of `range` in weeks, `0` when empty or reversed. */
export function getWindowWeeks(range: MeasurementRange): number {
  return Math.max(0, (Date.parse(range.to) - Date.parse(range.from)) / MS_PER_WEEK);
}

/** Multiplier turning a window total into a yearly one (`52 / 8` for 8 weeks); `0` for an empty window. */
export function getAnnualisationFactor(windowWeeks: number): number {
  return windowWeeks <= 0 ? 0 : WEEKS_PER_YEAR / windowWeeks;
}

/**
 * How far the estimate of a waste kind can be trusted: measured energy (high), rule-of-thumb ratio or share
 * (medium), assumes reorganizing occupants (low). `null` for a data-quality kind, which carries no estimate.
 */
export function getImpactConfidence(kind: FindingKind): Confidence | null {
  switch (kind) {
    case 'weekend-hvac':
      return 'high';
    case 'early-hvac-start':
    case 'night-baseload':
    case 'heating-setpoint':
      return 'medium';
    case 'low-occupancy':
      return 'low';
    case 'frozen-sensor':
    case 'missing-data':
      return null;
  }
}

/** Yearly kWh, € and kgCO₂e of `finding` in `country`; `null` when the finding carries no excess energy. */
export function estimateImpact(
  finding: Finding,
  country: Country,
  annualisationFactor: number,
): ImpactEstimate | null {
  const confidence = getImpactConfidence(finding.kind);
  if (finding.excessEnergyKwh === null || confidence === null) {
    return null;
  }
  const annualEnergyKwh = finding.excessEnergyKwh * annualisationFactor;
  return {
    findingId: finding.id,
    annualEnergyKwh,
    annualCostEur: annualEnergyKwh * country.electricityPriceEurPerKwh,
    annualEmissionsKgCo2e: annualEnergyKwh * country.gridEmissionFactorKgCo2ePerKwh,
    confidence,
  };
}

export function sumImpacts(estimates: readonly ImpactEstimate[]): ImpactTotals {
  return estimates.reduce(
    (totals: ImpactTotals, estimate: ImpactEstimate) => ({
      annualEnergyKwh: totals.annualEnergyKwh + estimate.annualEnergyKwh,
      annualCostEur: totals.annualCostEur + estimate.annualCostEur,
      annualEmissionsKgCo2e: totals.annualEmissionsKgCo2e + estimate.annualEmissionsKgCo2e,
    }),
    { annualEnergyKwh: 0, annualCostEur: 0, annualEmissionsKgCo2e: 0 },
  );
}

/**
 * Gross reduction of the portfolio emissions if every waste of `estimates` were fixed. Baseline emissions =
 * Σ building baseline energy × its country factor; a building whose country is unknown is left out of the baseline.
 */
export function getEstimatedReduction(
  buildings: readonly Building[],
  countries: readonly Country[],
  estimates: readonly ImpactEstimate[],
): EstimatedReduction {
  const factors = new Map(
    countries.map(
      (country: Country) => [country.code, country.gridEmissionFactorKgCo2ePerKwh] as const,
    ),
  );
  const baselineEmissionsKgCo2e = buildings.reduce(
    (sum: number, building: Building) =>
      sum + building.baselineAnnualEnergyKwh * getFactor(factors, building.countryCode),
    0,
  );
  const identifiedKgCo2e = sumImpacts(estimates).annualEmissionsKgCo2e;
  return {
    baselineEmissionsKgCo2e,
    identifiedKgCo2e,
    reductionPercent:
      baselineEmissionsKgCo2e <= 0 ? 0 : (identifiedKgCo2e / baselineEmissionsKgCo2e) * PERCENT,
  };
}

/** Value of `estimate` ranked by `key`. */
export function getImpactValue(estimate: ImpactEstimate, key: PrioritySortKey): number {
  switch (key) {
    case 'emissions':
      return estimate.annualEmissionsKgCo2e;
    case 'cost':
      return estimate.annualCostEur;
    case 'energy':
      return estimate.annualEnergyKwh;
  }
}

/** Copy of `items` from the largest to the smallest stake under `key`, ties by finding id. */
export function sortByImpact<T extends { readonly impact: ImpactEstimate }>(
  items: readonly T[],
  key: PrioritySortKey,
): T[] {
  return [...items].sort(
    (left: T, right: T) =>
      getImpactValue(right.impact, key) - getImpactValue(left.impact, key) ||
      left.impact.findingId.localeCompare(right.impact.findingId),
  );
}

function getFactor(factors: ReadonlyMap<CountryCode, number>, countryCode: CountryCode): number {
  return factors.get(countryCode) ?? 0;
}
