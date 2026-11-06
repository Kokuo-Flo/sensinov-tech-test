/**
 * Internal state of the dataset generator (`src/app/data/measurement/`), which simulates each building
 * on a 15-min grid and derives every measurement series from it. Never exposed to the app.
 */

/** Position of one simulation step in the local calendar (local time approximated as UTC+1, no DST). */
export interface StepClock {
  /** Local day since the start of the measurement window; `0` = its first day, a Monday. */
  readonly dayIndex: number;
  /** Local hour of day, fractional: `7.75` = 7:45. */
  readonly hour: number;
  /** Local Saturday or Sunday. */
  readonly isWeekend: boolean;
}

/** Simulated physical state of a whole building during one 15-min step; every series is read from it. */
export interface BuildingStep {
  /** Occupants present (persons), fractional before rounding. */
  readonly occupancyCount: number;

  /** `1` = HVAC running, `0` = stopped. */
  readonly hvacOn: number;
  /** Active heating setpoint, °C. */
  readonly setpointCelsius: number;
  /** Building-average indoor temperature, °C, before per-zone offsets. */
  readonly indoorTemperatureCelsius: number;
  /** Extra warming of south-facing zones by the sun, °C. */
  readonly solarGainCelsius: number;

  /** Mean electrical power over the step, W, as seen by the HVAC sub-meter. */
  readonly hvacPowerW: number;
  /** Mean electrical power over the step, W, as seen by the lighting & plugs sub-meter. */
  readonly lightingPlugsPowerW: number;
  /** Mean whole-building electrical power over the step, W, as seen by the main meter. */
  readonly mainPowerW: number;
}
