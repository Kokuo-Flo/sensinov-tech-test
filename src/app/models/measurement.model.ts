/** Raw time series reported by an equipment for one metric, as served by `EquipmentDao` (vendor units). */

import { type MetricKey, type SamplingIntervalMinutes } from './equipment.model';

export interface MeasurementSeries {
  readonly equipmentId: string;
  readonly metric: MetricKey;
  /** Vendor unit of every value, as in the equipment `MetricDefinition`: `'kWh'`, `'Wh'`, `'°C'`… */
  readonly unit: string;
  readonly intervalMinutes: SamplingIntervalMinutes;
  /** Chronological, one point per sampling interval. */
  readonly points: readonly MeasurementPoint[];
}

/** One reading of a series. */
export interface MeasurementPoint {
  /** Start of the sampling interval, ISO-8601 UTC. */
  readonly timestamp: string;
  /** Reading in the series unit (energy: consumed over the interval); `null` = missing sample. */
  readonly value: number | null;
}
