import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type DetectionSeries,
} from '#models/detection.model';
import { type MetricKey } from '#models/equipment.model';
import { type Finding } from '#models/finding.model';

import { toDataQualityFindings } from './data-quality.utils';
import { splitRuns } from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** Identical readings during at least this long mean a frozen sensor. */
export const FROZEN_SENSOR_MIN_HOURS = 24;
/**
 * Only measured quantities carry noise; a setpoint or an on/off state stays constant on purpose, and
 * occupancy is legitimately `0` all night and weekend.
 */
export const FROZEN_SENSOR_METRICS: readonly MetricKey[] = ['indoor-temperature', 'active-energy'];

/** Runs of identical non-null readings lasting at least {@link FROZEN_SENSOR_MIN_HOURS}. */
export function findFrozenRuns(series: DetectionSeries): DetectionPoint[][] {
  if (!FROZEN_SENSOR_METRICS.includes(series.metric)) {
    return [];
  }
  return splitRuns(
    series.points,
    (previous: DetectionPoint, current: DetectionPoint) =>
      previous.value !== null && previous.value === current.value,
  ).filter(
    (run: DetectionPoint[]) =>
      run[0]?.value !== null &&
      toHours(run.length, series.intervalMinutes) >= FROZEN_SENSOR_MIN_HOURS,
  );
}

/** DQ1 — Frozen sensor: one finding per equipment, `observed` = longest frozen run (h), `reference` = 24 h. */
export function detectFrozenSensors(input: BuildingDetectionInput): Finding[] {
  return toDataQualityFindings(
    'frozen-sensor',
    input,
    input.series.map((series: DetectionSeries) => ({ series, runs: findFrozenRuns(series) })),
    FROZEN_SENSOR_MIN_HOURS,
  );
}
