import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type DetectionSeries,
} from '#models/detection.model';
import { type Finding } from '#models/finding.model';

import { toDataQualityFindings } from './data-quality.utils';
import { splitRuns } from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** Consecutive readings without value during at least this long mean a silent equipment. */
export const MISSING_DATA_MIN_HOURS = 6;

/** Runs of `null` readings lasting at least {@link MISSING_DATA_MIN_HOURS}. */
export function findMissingRuns(series: DetectionSeries): DetectionPoint[][] {
  return splitRuns(
    series.points,
    (previous: DetectionPoint, current: DetectionPoint) =>
      previous.value === null && current.value === null,
  ).filter(
    (run: DetectionPoint[]) =>
      run[0]?.value === null && toHours(run.length, series.intervalMinutes) >= MISSING_DATA_MIN_HOURS,
  );
}

/** DQ2 — Missing data: one finding per equipment, `observed` = longest gap (h), `reference` = 6 h. */
export function detectMissingData(input: BuildingDetectionInput): Finding[] {
  return toDataQualityFindings(
    'missing-data',
    input,
    input.series.map((series: DetectionSeries) => ({ series, runs: findMissingRuns(series) })),
    MISSING_DATA_MIN_HOURS,
  );
}
