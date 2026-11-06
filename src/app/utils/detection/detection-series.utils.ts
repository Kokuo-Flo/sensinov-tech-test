import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type DetectionSeries,
  type LocalDay,
} from '#models/detection.model';
import { type Equipment, type MeterScope, type MetricKey } from '#models/equipment.model';
import { type MeasurementPoint, type MeasurementSeries } from '#models/measurement.model';

import { getLocalTime, toHours } from './detection-time.utils';
import { toKwh } from './energy.utils';

/** `series` of `equipment` placed in the local calendar, energy converted to kWh. */
export function toDetectionSeries(
  equipment: Equipment,
  series: MeasurementSeries,
): DetectionSeries {
  const isEnergy = series.metric === 'active-energy';
  return {
    equipment,
    metric: series.metric,
    intervalMinutes: series.intervalMinutes,
    points: series.points.map((point: MeasurementPoint) => {
      const localTime = getLocalTime(point.timestamp);
      return {
        timestamp: point.timestamp,
        value: isEnergy && point.value !== null ? toKwh(point.value, series.unit) : point.value,
        localDay: localTime.localDay,
        localHour: localTime.localHour,
        isWeekend: localTime.isWeekend,
      };
    }),
  };
}

/** First series of the building reporting `metric` (restricted to a meter scope for energy), or `null`. */
export function findSeries(
  input: BuildingDetectionInput,
  metric: MetricKey,
  meterScope: MeterScope | null = null,
): DetectionSeries | null {
  return (
    input.series.find(
      (series: DetectionSeries) =>
        series.metric === metric &&
        (meterScope === null || series.equipment.meterScope === meterScope),
    ) ?? null
  );
}

/** Chronological points grouped by local day, days in chronological order. */
export function groupByLocalDay(points: readonly DetectionPoint[]): LocalDay[] {
  const days = new Map<string, DetectionPoint[]>();
  points.forEach((point: DetectionPoint) => {
    const dayPoints = days.get(point.localDay);
    if (dayPoints === undefined) {
      days.set(point.localDay, [point]);
      return;
    }
    dayPoints.push(point);
  });
  return [...days.entries()].map(([localDay, dayPoints]: [string, DetectionPoint[]]) => ({
    localDay,
    isWeekend: dayPoints[0]?.isWeekend ?? false,
    points: dayPoints,
  }));
}

/** Local days of `points` indexed by `'YYYY-MM-DD'`. */
export function indexByLocalDay(points: readonly DetectionPoint[]): ReadonlyMap<string, LocalDay> {
  return new Map(groupByLocalDay(points).map((day: LocalDay) => [day.localDay, day] as const));
}

/** Non-null values of `points`, in order. */
export function readValues(points: readonly DetectionPoint[]): number[] {
  return points.flatMap((point: DetectionPoint) => (point.value === null ? [] : [point.value]));
}

/** Median of `values`, `null` when empty. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left: number, right: number) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 === 1 ? upper : ((sorted[middle - 1] ?? upper) + upper) / 2;
}

/** Sum of the non-null values of `points`, `0` when none. */
export function sumValues(points: readonly DetectionPoint[]): number {
  return readValues(points).reduce((sum: number, value: number) => sum + value, 0);
}

/** Energy (kWh) of `energy` over the local days `localDays`; a day without reading counts `0`. */
export function sumDaysEnergyKwh(energy: DetectionSeries, localDays: readonly string[]): number {
  const energyByDay = indexByLocalDay(energy.points);
  return localDays.reduce(
    (sum: number, localDay: string) => sum + sumValues(energyByDay.get(localDay)?.points ?? []),
    0,
  );
}

/** Mean of `values`, `null` when empty. */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
}

/** Number of distinct local days among `points`. */
export function countLocalDays(points: readonly DetectionPoint[]): number {
  return new Set(points.map((point: DetectionPoint) => point.localDay)).size;
}

/** Timestamps of the first point of the first day and of the last point of the last day; `null` when no point. */
export function getDaysSpan(
  days: readonly LocalDay[],
): { readonly firstSeenAt: string; readonly lastSeenAt: string } | null {
  const firstPoint = days[0]?.points[0];
  const lastDayPoints = days[days.length - 1]?.points ?? [];
  const lastPoint = lastDayPoints[lastDayPoints.length - 1];
  if (firstPoint === undefined || lastPoint === undefined) {
    return null;
  }
  return { firstSeenAt: firstPoint.timestamp, lastSeenAt: lastPoint.timestamp };
}

/** Minimum hours of readings for a local day to be judged (the window's first and last local days are partial). */
export const MIN_DAY_COVERAGE_HOURS = 20;

/** `true` when `day` holds at least {@link MIN_DAY_COVERAGE_HOURS} of non-null readings. */
export function hasDayCoverage(day: LocalDay, intervalMinutes: number): boolean {
  return toHours(readValues(day.points).length, intervalMinutes) >= MIN_DAY_COVERAGE_HOURS;
}

/** `true` when an on/off reading says running (`1`; hourly averages are already rounded by the source). */
export function isRunningPoint(point: DetectionPoint): boolean {
  return point.value !== null && point.value >= 0.5;
}

/** Consecutive chunks of `points`: a new chunk starts whenever `isSameRun(previous, current)` is false. */
export function splitRuns(
  points: readonly DetectionPoint[],
  isSameRun: (previous: DetectionPoint, current: DetectionPoint) => boolean,
): DetectionPoint[][] {
  return points.reduce<DetectionPoint[][]>((runs: DetectionPoint[][], point: DetectionPoint) => {
    const currentRun = runs[runs.length - 1];
    const previous = currentRun?.[currentRun.length - 1];
    if (currentRun === undefined || previous === undefined || !isSameRun(previous, point)) {
      runs.push([point]);
      return runs;
    }
    currentRun.push(point);
    return runs;
  }, []);
}
