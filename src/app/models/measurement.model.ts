import { type MetricKey, type SamplingIntervalMinutes } from './equipment.model';

export interface MeasurementPoint {
  /** ISO-8601 UTC, start of interval. */
  readonly timestamp: string;
  /** `null` = missing sample. */
  readonly value: number | null;
}

export interface MeasurementSeries {
  readonly equipmentId: string;
  readonly metric: MetricKey;
  readonly unit: string;
  readonly intervalMinutes: SamplingIntervalMinutes;
  readonly points: readonly MeasurementPoint[];
}
