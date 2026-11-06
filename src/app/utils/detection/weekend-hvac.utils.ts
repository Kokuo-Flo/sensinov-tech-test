import { type BuildingDetectionInput, type DetectionPoint, type LocalDay } from '#models/detection.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';

import {
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  isRunningPoint,
  readValues,
  sumDaysEnergyKwh,
} from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** A weekend day counts when the HVAC runs at least this long… */
export const WEEKEND_HVAC_MIN_RUNNING_HOURS = 4;
/** …while occupancy stays below this share of the building capacity. */
export const WEEKEND_HVAC_MAX_OCCUPANCY_RATIO = 0.05;
/** The finding needs at least this share of the weekend days. */
export const WEEKEND_HVAC_MIN_DAY_SHARE = 0.5;

/**
 * A1 — HVAC running on empty weekends. `observed` = weekend days with HVAC running
 * ≥ 4 h and occupancy < 5 % of capacity, `reference` = weekend days judged, `unit` = `'days'`.
 * Excess energy = whole HVAC sub-meter energy of the flagged weekend days (an empty building needs none).
 */
export function detectWeekendHvac(input: BuildingDetectionInput): Finding[] {
  const hvac = findSeries(input, 'hvac-status');
  const occupancy = findSeries(input, 'occupancy-count');
  if (hvac === null || occupancy === null) {
    return [];
  }
  const maxOccupancy = input.building.occupancyCapacity * WEEKEND_HVAC_MAX_OCCUPANCY_RATIO;
  const occupancyByDay = new Map(
    groupByLocalDay(occupancy.points).map((day: LocalDay) => [day.localDay, day.points] as const),
  );
  const weekendDays = groupByLocalDay(hvac.points).filter(
    (day: LocalDay) => day.isWeekend && hasDayCoverage(day, hvac.intervalMinutes),
  );
  const flaggedDays = weekendDays.filter((day: LocalDay) =>
    isEmptyBuildingRunning(
      day,
      hvac.intervalMinutes,
      occupancyByDay.get(day.localDay) ?? [],
      maxOccupancy,
    ),
  );
  const span = getDaysSpan(flaggedDays);
  if (span === null || flaggedDays.length < weekendDays.length * WEEKEND_HVAC_MIN_DAY_SHARE) {
    return [];
  }
  const hvacEnergy = findSeries(input, 'active-energy', 'hvac');
  return [
    {
      id: getFindingId('weekend-hvac', input.building.id),
      kind: 'weekend-hvac',
      category: getFindingCategory('weekend-hvac'),
      buildingId: input.building.id,
      ...span,
      occurrences: flaggedDays.length,
      observed: flaggedDays.length,
      reference: weekendDays.length,
      unit: 'days',
      evidence: [
        { equipmentId: hvac.equipment.id, metric: hvac.metric },
        { equipmentId: occupancy.equipment.id, metric: occupancy.metric },
      ],
      excessEnergyKwh:
        hvacEnergy === null
          ? null
          : sumDaysEnergyKwh(
              hvacEnergy,
              flaggedDays.map((day: LocalDay) => day.localDay),
            ),
    },
  ];
}

/** HVAC running long enough, with every occupancy reading of its running window below `maxOccupancy`. */
function isEmptyBuildingRunning(
  day: LocalDay,
  intervalMinutes: number,
  occupancyPoints: readonly DetectionPoint[],
  maxOccupancy: number,
): boolean {
  const runningPoints = day.points.filter(isRunningPoint);
  const firstRunning = runningPoints[0];
  const lastRunning = runningPoints[runningPoints.length - 1];
  if (
    firstRunning === undefined ||
    lastRunning === undefined ||
    toHours(runningPoints.length, intervalMinutes) < WEEKEND_HVAC_MIN_RUNNING_HOURS
  ) {
    return false;
  }
  const endHour = lastRunning.localHour + toHours(1, intervalMinutes);
  const occupancyValues = readValues(
    occupancyPoints.filter(
      (point: DetectionPoint) => point.localHour >= firstRunning.localHour && point.localHour < endHour,
    ),
  );
  return occupancyValues.length > 0 && Math.max(...occupancyValues) < maxOccupancy;
}
