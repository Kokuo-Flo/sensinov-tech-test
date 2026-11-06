/**
 * Yearly stake (energy, cost, emissions) of the waste findings and the reduction of the portfolio emissions they
 * represent. Computed by `src/app/utils/impact.utils.ts` and `PriorityService`, shown on the priorities page.
 */

import { type Country } from './country.model';
import { type Finding, type FindingEvidenceLink } from './finding.model';

/**
 * How far an estimate can be trusted: `'high'` = based on measured energy, `'medium'` = rule-of-thumb ratio or share,
 * `'low'` = assumes occupants are reorganized.
 */
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

/** Stake the waste list can be ranked by: emissions (kgCO₂e), cost (€) or energy (kWh), per year. */
export const PRIORITY_SORT_KEYS = ['emissions', 'cost', 'energy'] as const;

export const DEFAULT_PRIORITY_SORT_KEY: PrioritySortKey = 'emissions';

export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type PrioritySortKey = (typeof PRIORITY_SORT_KEYS)[number];

/** Yearly stake of one waste finding, extrapolated linearly from the analysis window. */
export interface ImpactEstimate {
  readonly findingId: string;
  /** kWh per year. */
  readonly annualEnergyKwh: number;
  /** € per year, at the building country electricity price. */
  readonly annualCostEur: number;
  /** kgCO₂e per year, at the building country grid emission factor. */
  readonly annualEmissionsKgCo2e: number;
  readonly confidence: Confidence;
}

/** Sum of several estimates, same units as {@link ImpactEstimate}. */
export interface ImpactTotals {
  readonly annualEnergyKwh: number;
  readonly annualCostEur: number;
  readonly annualEmissionsKgCo2e: number;
}

/** Gross reduction of the portfolio emissions if every identified waste were fixed, all in kgCO₂e per year. */
export interface EstimatedReduction {
  /** Σ building `baselineAnnualEnergyKwh` × its country emission factor. */
  readonly baselineEmissionsKgCo2e: number;
  /** Σ `annualEmissionsKgCo2e` of the estimates: reduction the identified wastes would bring. */
  readonly identifiedKgCo2e: number;
  /** Identified / baseline, percent (`9.4` = 9.4 %); `0` when the baseline is `0`. */
  readonly reductionPercent: number;
}

/** One line of the ranked waste list on the priorities page. */
export interface PriorityRow {
  /** 1-based position under the current sort. */
  readonly rank: number;
  readonly finding: Finding;
  readonly buildingName: string;
  readonly country: Country;
  readonly impact: ImpactEstimate;
  /** The building also has a data-quality finding: its figures are to be confirmed. */
  readonly hasDataQualityIssue: boolean;
  /** Link to the main evidence series; `null` when the finding has none. */
  readonly evidenceLink: FindingEvidenceLink | null;
}

/** Every hypothesis behind the figures, shown in « Comment c'est calculé ». */
export interface ImpactAssumptions {
  /** Length of the analysis window, weeks. */
  readonly windowWeeks: number;
  /** Weeks in a year used for the extrapolation (no seasonal model). */
  readonly weeksPerYear: number;
  /** Multiplier from window totals to yearly totals: `weeksPerYear / windowWeeks`. */
  readonly annualisationFactor: number;

  /** Early HVAC start: normal lead of the HVAC start over occupant arrival, hours. */
  readonly earlyStartReferenceLeadHours: number;
  /** Early HVAC start: share of the early-window HVAC energy not spent anyway by the morning recovery, 0–1. */
  readonly earlyStartRecoverableShare: number;
  /** Night baseload: night / day power ratio of a sound building, 0–1. */
  readonly nightHealthyRatio: number;
  /** Night baseload: hours of a working day outside opening, when only the baseload should run. */
  readonly nightClosedHoursPerWorkingDay: number;
  /** Heating setpoint: normal setpoint of the portfolio, °C. */
  readonly setpointReferenceCelsius: number;
  /** Heating setpoint: share of the HVAC energy saved per °C removed above the reference, 0–1. */
  readonly setpointEnergySharePerCelsius: number;
  /** Low occupancy: normal working-day occupancy peak, share of capacity, 0–1. */
  readonly nominalOccupancyPeakRatio: number;
  /** Low occupancy: share of the proportional saving actually reachable by grouping occupants, 0–1. */
  readonly lowOccupancyRecoverableShare: number;

  /** Countries of the ranked buildings with their factors, sorted by name. */
  readonly countries: readonly Country[];
}

export function isPrioritySortKey(value: string): value is PrioritySortKey {
  return PRIORITY_SORT_KEYS.some((key: PrioritySortKey) => key === value);
}
