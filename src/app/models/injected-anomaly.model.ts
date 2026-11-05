import { type MetricKey } from './equipment.model';

/**
 * Ground truth of a waste (A1–A5) or data-quality defect (DQ1–DQ2) injected into the generated measurements.
 * Hours are local hours (UTC+1 approximation); ranges are ISO-8601 UTC, `[from, to)`.
 */
interface InjectedAnomalyBase {
  /** e.g. `'A1'`, `'DQ2'`. */
  readonly code: string;
  readonly buildingId: string;
  /** What the anomaly is and its expected signature in the measurements. */
  readonly description: string;
}

export interface WeekendHvacAnomaly extends InjectedAnomalyBase {
  readonly kind: 'weekend-hvac';
  readonly weekendStartHour: number;
  readonly weekendEndHour: number;
  /** Weekend daily HVAC energy relative to a working day. */
  readonly weekendToWeekdayEnergyRatio: number;
}

export interface HeatingSetpointAnomaly extends InjectedAnomalyBase {
  readonly kind: 'heating-setpoint';
  readonly setpointCelsius: number;
  /** HVAC energy multiplier against the nominal 21 °C setpoint. */
  readonly hvacEnergyFactor: number;
}

export interface NightBaseloadAnomaly extends InjectedAnomalyBase {
  readonly kind: 'night-baseload';
  /** Lighting & plugs power outside opening hours relative to the working-day plateau. */
  readonly nightToDayPowerRatio: number;
}

export interface EarlyHvacStartAnomaly extends InjectedAnomalyBase {
  readonly kind: 'early-hvac-start';
  readonly weekdayStartHour: number;
}

export interface LowOccupancyAnomaly extends InjectedAnomalyBase {
  readonly kind: 'low-occupancy';
  /** Working-day plateau occupancy as a share of capacity (nominal ≈ 0.65). */
  readonly occupancyRate: number;
}

export interface FrozenSensorDefect extends InjectedAnomalyBase {
  readonly kind: 'frozen-sensor';
  readonly equipmentId: string;
  readonly metric: MetricKey;
  readonly from: string;
  readonly to: string;
  readonly frozenValue: number;
}

export interface MissingDataDefect extends InjectedAnomalyBase {
  readonly kind: 'missing-data';
  readonly equipmentId: string;
  readonly metric: MetricKey;
  readonly from: string;
  readonly to: string;
}

/** Defect altering the readings of one series (`equipmentId` × `metric`), not the building physics. */
export type DataQualityDefect = FrozenSensorDefect | MissingDataDefect;

export type InjectedAnomaly =
  | WeekendHvacAnomaly
  | HeatingSetpointAnomaly
  | NightBaseloadAnomaly
  | EarlyHvacStartAnomaly
  | LowOccupancyAnomaly
  | DataQualityDefect;

export type InjectedAnomalyKind = InjectedAnomaly['kind'];

export function isDataQualityDefect(anomaly: InjectedAnomaly): anomaly is DataQualityDefect {
  return anomaly.kind === 'frozen-sensor' || anomaly.kind === 'missing-data';
}
