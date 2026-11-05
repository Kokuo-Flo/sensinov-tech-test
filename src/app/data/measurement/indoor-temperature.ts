import { type BuildingStep } from '#models/building-simulation.model';

/** Without HVAC, internal gains keep the building ≈ 5 °C above outdoors, +3 °C more when fully occupied. */
const ENVELOPE_GAIN_CELSIUS = 5;
const OCCUPANT_GAIN_CELSIUS_AT_FULL_CAPACITY = 3;
/** Thermal mass keeps the free-floating temperature within this range. */
const MIN_FREE_FLOATING_CELSIUS = 12;
const MAX_FREE_FLOATING_CELSIUS = 26;
/** Share of the gap to the target closed per 15-min step: fast with HVAC, slow drift otherwise. */
const HVAC_RELAXATION_PER_STEP = 0.3;
const FREE_FLOATING_RELAXATION_PER_STEP = 0.05;

/** Sun on south façades: half-sine between 8:00 and 18:00, peaking at +0.9 °C. */
const SUNRISE_HOUR = 8;
const SUNSET_HOUR = 18;
const PEAK_SOLAR_GAIN_CELSIUS = 0.9;

/** North zones run slightly colder, south zones slightly warmer (and get the solar gain). */
const NORTH_ZONE = 'Nord';
const SOUTH_ZONE = 'Sud';
const NORTH_ZONE_OFFSET_CELSIUS = -0.4;
const SOUTH_ZONE_OFFSET_CELSIUS = 0.2;

/** Temperature the building drifts to when the HVAC is off, driven by outdoor temperature and occupants. */
export function getFreeFloatingTemperatureCelsius(
  outdoorCelsius: number,
  occupancyRatio: number,
): number {
  return Math.min(
    MAX_FREE_FLOATING_CELSIUS,
    Math.max(
      MIN_FREE_FLOATING_CELSIUS,
      outdoorCelsius +
        ENVELOPE_GAIN_CELSIUS +
        OCCUPANT_GAIN_CELSIUS_AT_FULL_CAPACITY * occupancyRatio,
    ),
  );
}

/** First-order thermal inertia: the indoor temperature moves part of the way toward its target each step. */
export function getNextIndoorTemperatureCelsius(
  currentCelsius: number,
  targetCelsius: number,
  isHvacRunning: boolean,
): number {
  const relaxation = isHvacRunning ? HVAC_RELAXATION_PER_STEP : FREE_FLOATING_RELAXATION_PER_STEP;
  return currentCelsius + (targetCelsius - currentCelsius) * relaxation;
}

export function getSolarGainCelsius(hour: number): number {
  if (hour < SUNRISE_HOUR || hour >= SUNSET_HOUR) {
    return 0;
  }
  return (
    PEAK_SOLAR_GAIN_CELSIUS *
    Math.sin((Math.PI * (hour - SUNRISE_HOUR)) / (SUNSET_HOUR - SUNRISE_HOUR))
  );
}

/** Temperature read by a sensor of `zone`: building average + zone offset + solar gain on the south side. */
export function getZoneTemperatureCelsius(step: BuildingStep, zone: string | null): number {
  const solarExposure = zone === SOUTH_ZONE ? 1 : 0;
  return (
    step.indoorTemperatureCelsius +
    getZoneOffsetCelsius(zone) +
    solarExposure * step.solarGainCelsius
  );
}

function getZoneOffsetCelsius(zone: string | null): number {
  if (zone === NORTH_ZONE) {
    return NORTH_ZONE_OFFSET_CELSIUS;
  }
  return zone === SOUTH_ZONE ? SOUTH_ZONE_OFFSET_CELSIUS : 0;
}
