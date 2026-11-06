import { type BuildingDetectionInput, type LocalDay } from '#models/detection.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';

import {
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  isRunningPoint,
  median,
  readValues,
  sumDaysEnergyKwh,
} from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** A median working-day occupancy peak below this share of capacity is an under-used building. */
export const LOW_OCCUPANCY_MAX_PEAK_RATIO = 0.4;
/** The HVAC runs on full hours when its median working-day running time reaches this value. */
export const LOW_OCCUPANCY_FULL_SCHEDULE_HOURS = 10;
/** Normal working-day occupancy peak of an office building, as a share of capacity. */
export const LOW_OCCUPANCY_NOMINAL_PEAK_RATIO = 0.65;
/** Grouping occupants frees whole zones but not the shared ones: only half of the proportional saving is reachable. */
export const LOW_OCCUPANCY_RECOVERABLE_SHARE = 0.5;

interface DayPeak {
  readonly day: LocalDay;
  readonly peakRatio: number;
}

/**
 * A5 — Building conditioned in full for few occupants. `observed` = median working-day occupancy peak
 * as a share of capacity, `reference` = the 0.4 threshold, `unit` = `'ratio'`; fires only when the HVAC
 * runs at least 10 h per working day (median).
 * Excess energy = HVAC sub-meter energy of the flagged days × (1 − observed / 0.65) × 0.5.
 */
export function detectLowOccupancy(input: BuildingDetectionInput): Finding[] {
  const occupancy = findSeries(input, 'occupancy-count');
  const hvac = findSeries(input, 'hvac-status');
  if (occupancy === null || hvac === null || input.building.occupancyCapacity <= 0) {
    return [];
  }
  const peaks = groupByLocalDay(occupancy.points)
    .filter((day: LocalDay) => !day.isWeekend && hasDayCoverage(day, occupancy.intervalMinutes))
    .map((day: LocalDay) => ({
      day,
      peakRatio: Math.max(0, ...readValues(day.points)) / input.building.occupancyCapacity,
    }));
  const medianPeak = median(peaks.map((peak: DayPeak) => peak.peakRatio));
  const medianRunningHours = median(
    groupByLocalDay(hvac.points)
      .filter((day: LocalDay) => !day.isWeekend && hasDayCoverage(day, hvac.intervalMinutes))
      .map((day: LocalDay) =>
        toHours(day.points.filter(isRunningPoint).length, hvac.intervalMinutes),
      ),
  );
  if (
    medianPeak === null ||
    medianRunningHours === null ||
    medianPeak >= LOW_OCCUPANCY_MAX_PEAK_RATIO ||
    medianRunningHours < LOW_OCCUPANCY_FULL_SCHEDULE_HOURS
  ) {
    return [];
  }
  const flaggedDays = peaks
    .filter((peak: DayPeak) => peak.peakRatio < LOW_OCCUPANCY_MAX_PEAK_RATIO)
    .map((peak: DayPeak) => peak.day);
  const span = getDaysSpan(flaggedDays);
  if (span === null) {
    return [];
  }
  const hvacEnergy = findSeries(input, 'active-energy', 'hvac');
  return [
    {
      id: getFindingId('low-occupancy', input.building.id),
      kind: 'low-occupancy',
      category: getFindingCategory('low-occupancy'),
      buildingId: input.building.id,
      ...span,
      occurrences: flaggedDays.length,
      observed: medianPeak,
      reference: LOW_OCCUPANCY_MAX_PEAK_RATIO,
      unit: 'ratio',
      evidence: [
        { equipmentId: occupancy.equipment.id, metric: occupancy.metric },
        { equipmentId: hvac.equipment.id, metric: hvac.metric },
      ],
      excessEnergyKwh:
        hvacEnergy === null
          ? null
          : sumDaysEnergyKwh(
              hvacEnergy,
              flaggedDays.map((day: LocalDay) => day.localDay),
            ) * getLowOccupancyWasteShare(medianPeak),
    },
  ];
}

/** Share of the HVAC energy wasted by conditioning for `peakRatio` occupants instead of the nominal peak. */
function getLowOccupancyWasteShare(peakRatio: number): number {
  return (
    Math.max(0, 1 - peakRatio / LOW_OCCUPANCY_NOMINAL_PEAK_RATIO) * LOW_OCCUPANCY_RECOVERABLE_SHARE
  );
}
