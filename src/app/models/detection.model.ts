/**
 * Inputs and output of the anomaly detection rules (`src/app/utils/detection/`): measurements reshaped
 * per building and placed in the local calendar, and the findings they produce. Used by `FindingService`.
 */

import { type Building } from './building.model';
import { type Equipment, type MetricKey, type SamplingIntervalMinutes } from './equipment.model';
import { type Finding } from './finding.model';

/** Everything the rules read about one building: its reference data and every series of its equipments. */
export interface BuildingDetectionInput {
  readonly building: Building;
  readonly series: readonly DetectionSeries[];
}

/** One series of one equipment, in detection units. */
export interface DetectionSeries {
  readonly equipment: Equipment;
  readonly metric: MetricKey;
  readonly intervalMinutes: SamplingIntervalMinutes;
  /** Chronological. */
  readonly points: readonly DetectionPoint[];
}

/** One reading prepared for the rules, placed in the local calendar (local time approximated as UTC+1). */
export interface DetectionPoint {
  /** Start of the sampling interval, ISO-8601 UTC. */
  readonly timestamp: string;
  /**
   * Energy: kWh over the interval, whatever the vendor unit. Other metrics: as received (°C, persons,
   * `1`/`0` for on/off). `null` = no usable value.
   */
  readonly value: number | null;
  /** Local calendar day, `'YYYY-MM-DD'`. */
  readonly localDay: string;
  /** Local hour of day, fractional: `7.75` = 7:45. */
  readonly localHour: number;
  /** Local Saturday or Sunday. */
  readonly isWeekend: boolean;
}

/** Points of one local day of a series, chronological; most rules reason day by day. */
export interface LocalDay {
  /** Local calendar day, `'YYYY-MM-DD'`. */
  readonly localDay: string;
  /** Local Saturday or Sunday. */
  readonly isWeekend: boolean;
  readonly points: readonly DetectionPoint[];
}

/** Runs of consecutive faulty points (frozen or missing) found by a data-quality rule in one series. */
export interface SeriesDefectRuns {
  readonly series: DetectionSeries;
  /** Each run is chronological and non-empty. */
  readonly runs: readonly (readonly DetectionPoint[])[];
}

/** Outcome of one detection pass over the portfolio, kept instead of the (heavy) series it was computed from. */
export interface DetectionResult {
  readonly buildings: readonly Building[];
  /** Equipments whose series were analyzed. */
  readonly equipments: readonly Equipment[];
  readonly findings: readonly Finding[];
}
