/** Position of one simulation step in the local calendar (local time approximated as UTC+1). */
export interface StepClock {
  /** Local day since the start of the measurement window (0 = first Monday). */
  readonly dayIndex: number;
  /** Local hour of day, fractional: `7.75` = 7:45. */
  readonly hour: number;
  readonly isWeekend: boolean;
}

/** Simulated physical state of a whole building during one 15-min step; every series is read from it. */
export interface BuildingStep {
  /** Persons, fractional before rounding. */
  readonly occupancyCount: number;
  /** `1` = running, `0` = stopped. */
  readonly hvacOn: number;
  readonly setpointCelsius: number;
  /** Building-average indoor temperature, before zone offsets. */
  readonly indoorTemperatureCelsius: number;
  /** Extra warming of south-facing zones by the sun. */
  readonly solarGainCelsius: number;
  readonly hvacPowerW: number;
  readonly lightingPlugsPowerW: number;
  /** Whole-building power seen by the main meter. */
  readonly mainPowerW: number;
}
