/**
 * Ground truth of the anomalies deliberately injected into the generated measurements: wastes A1–A5 and
 * data-quality defects DQ1–DQ2. Read by the dataset generator only (`src/app/data/`), never exposed
 * by a DAO; tests use it as the expected answer of the detection rules.
 *
 * Hours are local hours of day (local time approximated as UTC+1); ranges are ISO-8601 UTC, `[from, to)`.
 */

import { type MetricKey } from './equipment.model';

/** Any injected waste or defect, discriminated by `kind` (same values as the matching `FindingKind`). */
export type InjectedAnomaly =
  | WeekendHvacAnomaly
  | HeatingSetpointAnomaly
  | NightBaseloadAnomaly
  | EarlyHvacStartAnomaly
  | LowOccupancyAnomaly
  | DataQualityDefect;

/** Defect altering the readings of one series (`equipmentId` × `metric`), not the building physics. */
export type DataQualityDefect = FrozenSensorDefect | MissingDataDefect;

export type InjectedAnomalyKind = InjectedAnomaly['kind'];

/** Fields shared by every injected anomaly. */
interface InjectedAnomalyBase {
  /** Short reference used in docs and tests: `'A1'`…`'A5'` for wastes, `'DQ1'`, `'DQ2'` for defects. */
  readonly code: string;
  readonly buildingId: string;
  /** What the anomaly is and its expected signature in the measurements. */
  readonly description: string;
}

/** HVAC runs on weekends while the building is empty (A1 in the dataset). */
export interface WeekendHvacAnomaly extends InjectedAnomalyBase {
  readonly kind: 'weekend-hvac';
  /** Local hour the HVAC starts on Saturdays and Sundays. */
  readonly weekendStartHour: number;
  /** Local hour the HVAC stops on Saturdays and Sundays (exclusive). */
  readonly weekendEndHour: number;
  /** Weekend daily HVAC energy relative to a working day, 0–1. */
  readonly weekendToWeekdayEnergyRatio: number;
}

/** Heating setpoint above the nominal 21 °C (A2 in the dataset). */
export interface HeatingSetpointAnomaly extends InjectedAnomalyBase {
  readonly kind: 'heating-setpoint';
  /** Heating setpoint applied, °C. */
  readonly setpointCelsius: number;
  /** HVAC energy multiplier against the nominal 21 °C setpoint: `1.14` = +14 %. */
  readonly hvacEnergyFactor: number;
}

/** Lighting and plugs left on outside opening hours (A3 in the dataset). */
export interface NightBaseloadAnomaly extends InjectedAnomalyBase {
  readonly kind: 'night-baseload';
  /** Lighting & plugs power outside opening hours relative to the working-day plateau, 0–1. */
  readonly nightToDayPowerRatio: number;
}

/** HVAC started hours before occupants arrive on working days (A4 in the dataset). */
export interface EarlyHvacStartAnomaly extends InjectedAnomalyBase {
  readonly kind: 'early-hvac-start';
  /** Local hour the HVAC starts on working days (nominal: 7). */
  readonly weekdayStartHour: number;
}

/** Building under-used but conditioned as if full (A5 in the dataset). */
export interface LowOccupancyAnomaly extends InjectedAnomalyBase {
  readonly kind: 'low-occupancy';
  /** Working-day plateau occupancy, share of capacity, 0–1 (nominal ≈ 0.65). */
  readonly occupancyRate: number;
}

/** Sensor stuck on a constant value over `[from, to)` (DQ1 in the dataset). */
export interface FrozenSensorDefect extends InjectedAnomalyBase {
  readonly kind: 'frozen-sensor';
  readonly equipmentId: string;
  readonly metric: MetricKey;
  /** Start of the frozen range, ISO-8601 UTC (inclusive). */
  readonly from: string;
  /** End of the frozen range, ISO-8601 UTC (exclusive). */
  readonly to: string;
  /** Value reported during the range, in the metric unit. */
  readonly frozenValue: number;
}

/** Series without any reading (`null` values) over `[from, to)` (DQ2 in the dataset). */
export interface MissingDataDefect extends InjectedAnomalyBase {
  readonly kind: 'missing-data';
  readonly equipmentId: string;
  readonly metric: MetricKey;
  /** Start of the silent range, ISO-8601 UTC (inclusive). */
  readonly from: string;
  /** End of the silent range, ISO-8601 UTC (exclusive). */
  readonly to: string;
}

export function isDataQualityDefect(anomaly: InjectedAnomaly): anomaly is DataQualityDefect {
  return anomaly.kind === 'frozen-sensor' || anomaly.kind === 'missing-data';
}
