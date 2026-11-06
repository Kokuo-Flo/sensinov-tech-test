import { type BuildingDetectionInput, type LocalDay } from '#models/detection.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';

import {
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  median,
  readValues,
  sumDaysEnergyKwh,
} from './detection-series.utils';

/** Normal operating setpoint of the portfolio. */
export const HEATING_SETPOINT_REFERENCE_CELSIUS = 21;
/** A median setpoint above this value is an overheated building. */
export const HEATING_SETPOINT_MAX_MEDIAN_CELSIUS = 21.5;
/** Common order of magnitude: each °C above the reference costs about 7 % of the HVAC energy (to be validated). */
export const HEATING_SETPOINT_ENERGY_SHARE_PER_CELSIUS = 0.07;

interface DaySetpoint {
  readonly day: LocalDay;
  readonly medianCelsius: number;
}

/**
 * A2 — Overheated setpoint. `observed` = median heating setpoint over the window,
 * `reference` = 21 °C, `unit` = `'°C'`; occurrences = fully covered days whose median setpoint is above 21.5 °C.
 * Excess energy = Σ over flagged days of HVAC sub-meter energy × 7 % × (day median setpoint − 21 °C).
 */
export function detectHeatingSetpoint(input: BuildingDetectionInput): Finding[] {
  const setpoint = findSeries(input, 'heating-setpoint');
  if (setpoint === null) {
    return [];
  }
  const medianSetpoint = median(readValues(setpoint.points));
  if (medianSetpoint === null || medianSetpoint <= HEATING_SETPOINT_MAX_MEDIAN_CELSIUS) {
    return [];
  }
  const flaggedSetpoints = groupByLocalDay(setpoint.points)
    .filter((day: LocalDay) => hasDayCoverage(day, setpoint.intervalMinutes))
    .map((day: LocalDay) => ({
      day,
      medianCelsius: median(readValues(day.points)) ?? HEATING_SETPOINT_REFERENCE_CELSIUS,
    }))
    .filter(
      (daySetpoint: DaySetpoint) => daySetpoint.medianCelsius > HEATING_SETPOINT_MAX_MEDIAN_CELSIUS,
    );
  const flaggedDays = flaggedSetpoints.map((daySetpoint: DaySetpoint) => daySetpoint.day);
  const span = getDaysSpan(flaggedDays);
  if (span === null) {
    return [];
  }
  const hvacEnergy = findSeries(input, 'active-energy', 'hvac');
  return [
    {
      id: getFindingId('heating-setpoint', input.building.id),
      kind: 'heating-setpoint',
      category: getFindingCategory('heating-setpoint'),
      buildingId: input.building.id,
      ...span,
      occurrences: flaggedDays.length,
      observed: medianSetpoint,
      reference: HEATING_SETPOINT_REFERENCE_CELSIUS,
      unit: '°C',
      evidence: [{ equipmentId: setpoint.equipment.id, metric: setpoint.metric }],
      excessEnergyKwh:
        hvacEnergy === null
          ? null
          : flaggedSetpoints.reduce(
              (sum: number, daySetpoint: DaySetpoint) =>
                sum +
                sumDaysEnergyKwh(hvacEnergy, [daySetpoint.day.localDay]) *
                  HEATING_SETPOINT_ENERGY_SHARE_PER_CELSIUS *
                  (daySetpoint.medianCelsius - HEATING_SETPOINT_REFERENCE_CELSIUS),
              0,
            ),
    },
  ];
}
