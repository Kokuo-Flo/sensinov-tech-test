import { findBuildingAnomaly } from '#data/anomalies.data';
import { type StepClock } from '#models/building-simulation.model';
import { type Building } from '#models/building.model';

/** Nominal schedule: HVAC runs 7:00–19:00 on working days, stopped on weekends. */
const NOMINAL_HVAC_START_HOUR = 7;
const HVAC_STOP_HOUR = 19;
const NOMINAL_SETPOINT_CELSIUS = 21;

/** Energy intensity of the reference building (kWh/m²/yr): an older building consumes proportionally more. */
const REFERENCE_INTENSITY_KWH_PER_M2 = 190;
/** Fans run at constant power whenever the HVAC is on. */
const VENTILATION_POWER_W_PER_M2 = 9;
/** Heating power per kelvin of gap between the nominal setpoint and the outdoor temperature. */
const HEATING_POWER_W_PER_M2_PER_KELVIN = 2.8;
/** Controllers, pumps and frost protection while stopped. */
const HVAC_STANDBY_POWER_W_PER_M2 = 0.6;

/** HVAC behavior of one building, nominal or altered by anomalies A1 (weekend), A2 (setpoint), A4 (early start). */
interface HvacSettings {
  readonly weekdayStartHour: number;
  /** `null` = stopped on weekends (nominal). */
  readonly weekend: {
    readonly startHour: number;
    readonly endHour: number;
    /** Running power multiplier on weekends. */
    readonly powerFactor: number;
  } | null;
  readonly setpointCelsius: number;
  /** Extra energy of an overheated setpoint (A2), `1` when nominal. */
  readonly setpointEnergyFactor: number;
  /** Building intensity relative to the reference building. */
  readonly efficiencyFactor: number;
}

export function getHvacSettings(building: Building): HvacSettings {
  const weekendHvac = findBuildingAnomaly(building.id, 'weekend-hvac');
  const setpointAnomaly = findBuildingAnomaly(building.id, 'heating-setpoint');
  const earlyStart = findBuildingAnomaly(building.id, 'early-hvac-start');
  return {
    weekdayStartHour: earlyStart?.weekdayStartHour ?? NOMINAL_HVAC_START_HOUR,
    weekend:
      weekendHvac === null
        ? null
        : {
            startHour: weekendHvac.weekendStartHour,
            endHour: weekendHvac.weekendEndHour,
            // Weekend running hours differ from a working day: scale power so the daily energy matches the declared ratio.
            powerFactor:
              (weekendHvac.weekendToWeekdayEnergyRatio *
                (HVAC_STOP_HOUR - NOMINAL_HVAC_START_HOUR)) /
              (weekendHvac.weekendEndHour - weekendHvac.weekendStartHour),
          },
    setpointCelsius: setpointAnomaly?.setpointCelsius ?? NOMINAL_SETPOINT_CELSIUS,
    setpointEnergyFactor: setpointAnomaly?.hvacEnergyFactor ?? 1,
    efficiencyFactor:
      building.baselineAnnualEnergyKwh / building.surfaceM2 / REFERENCE_INTENSITY_KWH_PER_M2,
  };
}

/** HVAC on/off schedule: working-day hours, plus weekend hours under anomaly A1. */
export function isHvacRunning(clock: StepClock, hvac: HvacSettings): boolean {
  if (clock.isWeekend) {
    return (
      hvac.weekend !== null &&
      clock.hour >= hvac.weekend.startHour &&
      clock.hour < hvac.weekend.endHour
    );
  }
  return clock.hour >= hvac.weekdayStartHour && clock.hour < HVAC_STOP_HOUR;
}

/** HVAC electrical power: standby when stopped, ventilation + heating need when running, scaled by building intensity. */
export function getHvacPowerWPerM2(
  clock: StepClock,
  isRunning: boolean,
  outdoorCelsius: number,
  hvac: HvacSettings,
): number {
  const powerWPerM2 = isRunning
    ? getRunningPowerWPerM2(clock, outdoorCelsius, hvac)
    : HVAC_STANDBY_POWER_W_PER_M2;
  return powerWPerM2 * hvac.efficiencyFactor * hvac.setpointEnergyFactor;
}

/**
 * Heating need grows as the outdoor temperature drops below 21 °C. It is computed against the nominal setpoint:
 * the cost of an overheated setpoint (A2) is applied separately as `setpointEnergyFactor`.
 */
function getRunningPowerWPerM2(
  clock: StepClock,
  outdoorCelsius: number,
  hvac: HvacSettings,
): number {
  return (
    (VENTILATION_POWER_W_PER_M2 +
      HEATING_POWER_W_PER_M2_PER_KELVIN * Math.max(0, NOMINAL_SETPOINT_CELSIUS - outdoorCelsius)) *
    (clock.isWeekend ? (hvac.weekend?.powerFactor ?? 0) : 1)
  );
}
