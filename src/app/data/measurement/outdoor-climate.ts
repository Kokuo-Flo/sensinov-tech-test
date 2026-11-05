import { type SeededRandom } from '#data/utils/seeded-random';
import { type StepClock } from '#models/building-simulation.model';

import { HOURS_PER_DAY, WINDOW_DAYS } from './clock';

/**
 * Synthetic outdoor temperature, internal to the generator (weather is out of scope and never exposed).
 * It only drives the heating need of the HVAC and the free-floating indoor temperature.
 */

/** Mean outdoor temperature on the first day: mild early September. */
const SEASON_START_OUTDOOR_CELSIUS = 19;
/** Linear cooling over the window, down to ≈ 7 °C at the end of October (heating season). */
const SEASON_COOLING_CELSIUS = 12;
/** Half amplitude of the day/night swing. */
const DAILY_SWING_CELSIUS = 4;
/** Local hour of the daily maximum. */
const WARMEST_HOUR = 15;
/** Share of yesterday's weather deviation kept today: a cold spell lasts a few days. */
const WEATHER_PERSISTENCE = 0.6;
const WEATHER_NOISE_CELSIUS = 2;

/** Climate of each city relative to Paris. */
const CLIMATE_OFFSETS: readonly { readonly buildingId: string; readonly offsetCelsius: number }[] =
  [
    { buildingId: 'bld-paris', offsetCelsius: 0 },
    { buildingId: 'bld-lyon', offsetCelsius: 0.5 },
    { buildingId: 'bld-warsaw', offsetCelsius: -2.5 },
    { buildingId: 'bld-berlin', offsetCelsius: -1.5 },
    { buildingId: 'bld-munich', offsetCelsius: -2 },
    { buildingId: 'bld-madrid', offsetCelsius: 4 },
    { buildingId: 'bld-milan', offsetCelsius: 2 },
    { buildingId: 'bld-amsterdam', offsetCelsius: -1 },
    { buildingId: 'bld-brussels', offsetCelsius: -0.5 },
    { buildingId: 'bld-krakow', offsetCelsius: -3 },
  ];

export function getClimateOffsetCelsius(buildingId: string): number {
  return (
    CLIMATE_OFFSETS.find(
      (entry: { readonly buildingId: string }) => entry.buildingId === buildingId,
    )?.offsetCelsius ?? 0
  );
}

/** Day-to-day weather deviation (°C), autocorrelated so that cold or warm spells span several days. */
export function drawDailyWeatherDeviations(random: SeededRandom): number[] {
  let deviation = 0;
  return Array.from({ length: WINDOW_DAYS + 1 }, () => {
    deviation = WEATHER_PERSISTENCE * deviation + random.noise(WEATHER_NOISE_CELSIUS);
    return deviation;
  });
}

/** Seasonal trend (19 °C → 7 °C) + city offset + daily weather + day/night swing peaking at 15:00. */
export function getOutdoorTemperatureCelsius(
  clock: StepClock,
  climateOffsetCelsius: number,
  weatherDeviationCelsius: number,
): number {
  return (
    SEASON_START_OUTDOOR_CELSIUS -
    (SEASON_COOLING_CELSIUS * clock.dayIndex) / WINDOW_DAYS +
    climateOffsetCelsius +
    weatherDeviationCelsius +
    DAILY_SWING_CELSIUS * Math.cos((2 * Math.PI * (clock.hour - WARMEST_HOUR)) / HOURS_PER_DAY)
  );
}
