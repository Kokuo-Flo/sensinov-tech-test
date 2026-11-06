import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type DetectionSeries,
  type LocalDay,
} from '#models/detection.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';

import {
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  indexByLocalDay,
  isRunningPoint,
  median,
} from './detection-series.utils';
import { toHours } from './detection-time.utils';

/** Occupants have arrived once occupancy reaches this share of the building capacity. */
export const EARLY_HVAC_ARRIVAL_OCCUPANCY_RATIO = 0.05;
/** A median HVAC lead over arrivals longer than this is an early start. */
export const EARLY_HVAC_MAX_LEAD_HOURS = 2;
/** Reference start: one hour before arrivals is enough to bring an office building to temperature. */
export const EARLY_HVAC_REFERENCE_LEAD_HOURS = 1;
/** Half of the early-window energy would be spent anyway in the morning recovery after a nominal start. */
export const EARLY_HVAC_RECOVERABLE_SHARE = 0.5;

interface WorkingDayStart {
  readonly day: LocalDay;
  readonly startHour: number;
  readonly arrivalHour: number;
}

/**
 * A4 — HVAC started long before occupants arrive. On each working day, local hour of the first running
 * reading vs. local hour occupancy first reaches 5 % of capacity. `observed` = median HVAC start hour,
 * `reference` = median arrival hour, `unit` = `'h'` (local hour of day).
 * Excess energy = HVAC sub-meter energy, on each flagged day, between the observed start and the reference
 * start (arrival − 1 h), × {@link EARLY_HVAC_RECOVERABLE_SHARE}.
 */
export function detectEarlyHvacStart(input: BuildingDetectionInput): Finding[] {
  const hvac = findSeries(input, 'hvac-status');
  const occupancy = findSeries(input, 'occupancy-count');
  if (hvac === null || occupancy === null) {
    return [];
  }
  const arrivalOccupancy = input.building.occupancyCapacity * EARLY_HVAC_ARRIVAL_OCCUPANCY_RATIO;
  const arrivalHours = new Map(
    groupByLocalDay(occupancy.points).map(
      (day: LocalDay) =>
        [
          day.localDay,
          day.points.find(
            (point: DetectionPoint) => point.value !== null && point.value >= arrivalOccupancy,
          )?.localHour,
        ] as const,
    ),
  );
  const starts = groupByLocalDay(hvac.points)
    .filter((day: LocalDay) => !day.isWeekend && hasDayCoverage(day, hvac.intervalMinutes))
    .flatMap((day: LocalDay): WorkingDayStart[] => {
      const startHour = day.points.find(isRunningPoint)?.localHour;
      const arrivalHour = arrivalHours.get(day.localDay);
      return startHour === undefined || arrivalHour === undefined
        ? []
        : [{ day, startHour, arrivalHour }];
    });
  const medianStart = median(starts.map((start: WorkingDayStart) => start.startHour));
  const medianArrival = median(starts.map((start: WorkingDayStart) => start.arrivalHour));
  const medianLead = median(starts.map(getLeadHours));
  if (
    medianStart === null ||
    medianArrival === null ||
    medianLead === null ||
    medianLead <= EARLY_HVAC_MAX_LEAD_HOURS
  ) {
    return [];
  }
  const flaggedStarts = starts.filter(
    (start: WorkingDayStart) => getLeadHours(start) > EARLY_HVAC_MAX_LEAD_HOURS,
  );
  const flaggedDays = flaggedStarts.map((start: WorkingDayStart) => start.day);
  const span = getDaysSpan(flaggedDays);
  if (span === null) {
    return [];
  }
  const hvacEnergy = findSeries(input, 'active-energy', 'hvac');
  return [
    {
      id: getFindingId('early-hvac-start', input.building.id),
      kind: 'early-hvac-start',
      category: getFindingCategory('early-hvac-start'),
      buildingId: input.building.id,
      ...span,
      occurrences: flaggedDays.length,
      observed: medianStart,
      reference: medianArrival,
      unit: 'h',
      evidence: [
        { equipmentId: hvac.equipment.id, metric: hvac.metric },
        { equipmentId: occupancy.equipment.id, metric: occupancy.metric },
      ],
      excessEnergyKwh: hvacEnergy === null ? null : getEarlyStartExcessKwh(hvacEnergy, flaggedStarts),
    },
  ];
}

/**
 * HVAC energy between each day's observed start and its reference start (arrival − 1 h), × the recoverable
 * share: the rest would be spent anyway bringing the building back to temperature.
 */
function getEarlyStartExcessKwh(
  hvacEnergy: DetectionSeries,
  flaggedStarts: readonly WorkingDayStart[],
): number {
  const energyByDay = indexByLocalDay(hvacEnergy.points);
  const intervalHours = toHours(1, hvacEnergy.intervalMinutes);
  const earlyWindowKwh = flaggedStarts.reduce((sum: number, start: WorkingDayStart) => {
    const referenceStartHour = start.arrivalHour - EARLY_HVAC_REFERENCE_LEAD_HOURS;
    const dayPoints = energyByDay.get(start.day.localDay)?.points ?? [];
    return (
      sum +
      dayPoints.reduce(
        (daySum: number, point: DetectionPoint) =>
          daySum +
          (point.value ?? 0) *
            getOverlapShare(point.localHour, intervalHours, start.startHour, referenceStartHour),
        0,
      )
    );
  }, 0);
  return earlyWindowKwh * EARLY_HVAC_RECOVERABLE_SHARE;
}

/** Share of the interval `[hour, hour + intervalHours)` lying inside `[fromHour, toHour)`, `0` to `1`. */
function getOverlapShare(
  hour: number,
  intervalHours: number,
  fromHour: number,
  toHour: number,
): number {
  const overlapHours = Math.min(hour + intervalHours, toHour) - Math.max(hour, fromHour);
  return Math.max(0, overlapHours) / intervalHours;
}

function getLeadHours(start: WorkingDayStart): number {
  return start.arrivalHour - start.startHour;
}
