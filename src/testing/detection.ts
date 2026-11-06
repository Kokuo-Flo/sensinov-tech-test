import { BUILDINGS } from '#data/building.data';
import { EQUIPMENTS } from '#data/equipment.data';
import { generateMeasurementSeries } from '#data/measurement/index';
import { type Building } from '#models/building.model';
import { type BuildingDetectionInput, type DetectionPoint, type DetectionSeries } from '#models/detection.model';
import { toDetectionSeries } from '#utils/detection/detection-series.utils';
import { type Equipment, type EquipmentType, type MetricDefinition, type MeterScope, type MetricKey, type SamplingIntervalMinutes } from '#models/equipment.model';

import { makeBuilding, makeEquipment } from './fixtures';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
/** Local time is UTC+1: a local day starts at 23:00 UTC the day before. */
const LOCAL_OFFSET_HOURS = 1;

/** Monday 2026-09-07 + `offset` days, as a local `'YYYY-MM-DD'` day (offsets 5 and 6 are the first weekend). */
export function localDayOf(offset: number): string {
  return new Date(Date.parse('2026-09-07T00:00:00Z') + offset * MS_PER_DAY).toISOString().slice(0, 10);
}

/** One reading at `hour` (fractional local hour) of the local day `localDay`. */
export function localPoint(localDay: string, hour: number, value: number | null): DetectionPoint {
  const dayStart = Date.parse(`${localDay}T00:00:00Z`);
  const weekday = new Date(dayStart).getUTCDay();
  return {
    timestamp: new Date(dayStart + (hour - LOCAL_OFFSET_HOURS) * MS_PER_HOUR).toISOString(),
    value,
    localDay,
    localHour: hour,
    isWeekend: weekday === 0 || weekday === 6,
  };
}

/** Readings of one local day over local hours `[fromHour, toHour)`, value computed from the local hour. */
export function dayPoints(
  localDay: string,
  valueAt: (hour: number) => number | null,
  intervalMinutes: SamplingIntervalMinutes = 60,
  fromHour = 0,
  toHour = 24,
): DetectionPoint[] {
  const step = intervalMinutes / 60;
  const count = Math.round((toHour - fromHour) / step);
  return Array.from({ length: count }, (_: unknown, index: number) => {
    const hour = fromHour + index * step;
    return localPoint(localDay, hour, valueAt(hour));
  });
}

/** Readings of the local days `offsets` (see {@link localDayOf}), concatenated in the given order. */
export function daysPoints(
  offsets: readonly number[],
  valueAt: (hour: number, offset: number) => number | null,
  intervalMinutes: SamplingIntervalMinutes = 60,
): DetectionPoint[] {
  return offsets.flatMap((offset: number) =>
    dayPoints(localDayOf(offset), (hour: number) => valueAt(hour, offset), intervalMinutes),
  );
}

export interface DetectionSeriesOptions {
  readonly equipmentId?: string;
  readonly type?: EquipmentType;
  readonly meterScope?: MeterScope | null;
  readonly intervalMinutes?: SamplingIntervalMinutes;
}

export function makeDetectionSeries(
  metric: MetricKey,
  points: readonly DetectionPoint[],
  options: DetectionSeriesOptions = {},
): DetectionSeries {
  return {
    equipment: makeEquipment({
      id: options.equipmentId ?? `eq-${metric}${options.meterScope ? `-${options.meterScope}` : ''}`,
      type: options.type ?? 'energy-meter',
      meterScope: options.meterScope ?? null,
    }),
    metric,
    intervalMinutes: options.intervalMinutes ?? 60,
    points,
  };
}

export function makeDetectionInput(
  series: readonly DetectionSeries[],
  capacity = 100,
): BuildingDetectionInput {
  return { building: makeBuilding({ id: 'bld-test', occupancyCapacity: capacity }), series };
}

/** Working days (Mon–Fri) over the first `weeks` weeks of the fixture calendar. */
export function workingOffsets(weeks: number): number[] {
  return Array.from({ length: weeks * 7 }, (_: unknown, index: number) => index).filter(
    (index: number) => index % 7 < 5,
  );
}

/** Saturdays and Sundays over the first `weeks` weeks of the fixture calendar. */
export function weekendOffsets(weeks: number): number[] {
  return Array.from({ length: weeks * 7 }, (_: unknown, index: number) => index).filter(
    (index: number) => index % 7 >= 5,
  );
}

/** Detection input of `building` built from the generated dataset (every series, whole window). */
export function realDetectionInput(building: Building): BuildingDetectionInput {
  return {
    building,
    series: EQUIPMENTS.filter((equipment: Equipment) => equipment.buildingId === building.id).flatMap(
      (equipment: Equipment) =>
        equipment.metrics.map((definition: MetricDefinition) =>
          toDetectionSeries(equipment, generateMeasurementSeries(equipment, definition)),
        ),
    ),
  };
}

/** Detection inputs of every building of the dataset. */
export function realDetectionInputs(): BuildingDetectionInput[] {
  return BUILDINGS.map((building: Building) => realDetectionInput(building));
}
