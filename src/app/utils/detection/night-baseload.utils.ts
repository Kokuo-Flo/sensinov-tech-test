import { type BuildingDetectionInput, type DetectionPoint, type LocalDay } from '#models/detection.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';

import {
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  mean,
  median,
  readValues,
} from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** Night window, local hours `[start, end)`. */
export const NIGHT_BASELOAD_NIGHT_HOURS = { start: 0, end: 5 } as const;
/** Working-day plateau window, local hours `[start, end)`. */
export const NIGHT_BASELOAD_DAY_HOURS = { start: 10, end: 17 } as const;
/** Night / day power ratio of a sound building (baseload only at night). */
export const NIGHT_BASELOAD_HEALTHY_RATIO = 0.2;
/** A median ratio above this value means lighting & plugs stay on at night. */
export const NIGHT_BASELOAD_MAX_RATIO = 0.4;
/** Hours of a working day outside opening (offices open about 7:30–19:30), when only the baseload should run. */
export const NIGHT_BASELOAD_CLOSED_HOURS_PER_WORKING_DAY = 12;

/** Mean lighting & plugs power of one working day on the night and plateau windows. */
interface DayPowers {
  readonly nightKw: number;
  readonly plateauKw: number;
}

interface DayRatio {
  readonly day: LocalDay;
  readonly ratio: number;
  readonly powers: DayPowers;
}

/**
 * A3 — Lighting & plugs left on at night. On each working day, mean power 0–5 h over mean power 10–17 h
 * of the lighting & plugs meter. `observed` = median ratio, `reference` = 0.2, `unit` = `'ratio'`.
 * Excess energy = Σ over flagged days of (night power − 0.2 × plateau power) × 12 closed hours; weekends are
 * left out, which under-estimates the waste.
 */
export function detectNightBaseload(input: BuildingDetectionInput): Finding[] {
  const lighting = findSeries(input, 'active-energy', 'lighting-plugs');
  if (lighting === null) {
    return [];
  }
  const dayRatios = groupByLocalDay(lighting.points)
    .filter((day: LocalDay) => !day.isWeekend && hasDayCoverage(day, lighting.intervalMinutes))
    .flatMap((day: LocalDay): DayRatio[] => {
      const powers = getDayPowers(day, lighting.intervalMinutes);
      return powers === null ? [] : [{ day, ratio: powers.nightKw / powers.plateauKw, powers }];
    });
  const medianRatio = median(dayRatios.map((dayRatio: DayRatio) => dayRatio.ratio));
  if (medianRatio === null || medianRatio <= NIGHT_BASELOAD_MAX_RATIO) {
    return [];
  }
  const flaggedRatios = dayRatios.filter(
    (dayRatio: DayRatio) => dayRatio.ratio > NIGHT_BASELOAD_MAX_RATIO,
  );
  const flaggedDays = flaggedRatios.map((dayRatio: DayRatio) => dayRatio.day);
  const span = getDaysSpan(flaggedDays);
  if (span === null) {
    return [];
  }
  return [
    {
      id: getFindingId('night-baseload', input.building.id),
      kind: 'night-baseload',
      category: getFindingCategory('night-baseload'),
      buildingId: input.building.id,
      ...span,
      occurrences: flaggedDays.length,
      observed: medianRatio,
      reference: NIGHT_BASELOAD_HEALTHY_RATIO,
      unit: 'ratio',
      evidence: [{ equipmentId: lighting.equipment.id, metric: lighting.metric }],
      excessEnergyKwh: flaggedRatios.reduce(
        (sum: number, dayRatio: DayRatio) => sum + getNightExcessKwh(dayRatio.powers),
        0,
      ),
    },
  ];
}

/** Mean power (kW) on the night and plateau windows: mean energy per point over the interval length. */
function getDayPowers(day: LocalDay, intervalMinutes: number): DayPowers | null {
  const night = mean(readValues(day.points.filter(isInWindow(NIGHT_BASELOAD_NIGHT_HOURS))));
  const plateau = mean(readValues(day.points.filter(isInWindow(NIGHT_BASELOAD_DAY_HOURS))));
  if (night === null || plateau === null || plateau <= 0) {
    return null;
  }
  const intervalHours = toHours(1, intervalMinutes);
  return { nightKw: night / intervalHours, plateauKw: plateau / intervalHours };
}

function getNightExcessKwh(powers: DayPowers): number {
  return (
    Math.max(0, powers.nightKw - NIGHT_BASELOAD_HEALTHY_RATIO * powers.plateauKw) *
    NIGHT_BASELOAD_CLOSED_HOURS_PER_WORKING_DAY
  );
}

function isInWindow(hours: {
  readonly start: number;
  readonly end: number;
}): (point: DetectionPoint) => boolean {
  return (point: DetectionPoint) => point.localHour >= hours.start && point.localHour < hours.end;
}
