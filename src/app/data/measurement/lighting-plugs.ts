import { findBuildingAnomaly } from '#data/anomalies.data';
import { type SeededRandom } from '#data/utils/seeded-random';
import { type StepClock } from '#models/building-simulation.model';

import { NOMINAL_OCCUPANCY_RATE } from './occupancy';

/** Permanent baseload (emergency lighting, network, standby devices), drawn per building. */
const MIN_BASELOAD_W_PER_M2 = 2;
const MAX_BASELOAD_W_PER_M2 = 3;
/** General lighting during opening hours, independent of how many people are there. */
const LIGHTING_POWER_W_PER_M2 = 4.5;
/** Desks, screens and kitchenettes when occupancy is at its nominal plateau; proportional to occupancy. */
const PLUGS_POWER_W_PER_M2_AT_NOMINAL_OCCUPANCY = 5;
/** Lights and plugs are switched on a little before arrivals and off a little after departures. */
const OPENING_HOUR = 7.5;
const CLOSING_HOUR = 19.5;
/** A few corridors lit on weekend days. */
const WEEKEND_LIGHTING_POWER_W_PER_M2 = 0.5;
const WEEKEND_LIGHTING_START_HOUR = 9;
const WEEKEND_LIGHTING_END_HOUR = 17;

/** Lighting & plugs levels of one building, nominal or altered by anomaly A3 (night baseload). */
interface LightingPlugsSettings {
  readonly baseloadWPerM2: number;
  /** Power left on outside opening hours: the baseload, or a share of the day plateau under A3. */
  readonly nightWPerM2: number;
}

export function drawLightingBaseloadWPerM2(random: SeededRandom): number {
  return random.between(MIN_BASELOAD_W_PER_M2, MAX_BASELOAD_W_PER_M2);
}

export function getLightingPlugsSettings(
  buildingId: string,
  baseloadWPerM2: number,
): LightingPlugsSettings {
  const nightBaseload = findBuildingAnomaly(buildingId, 'night-baseload');
  const dayPlateauWPerM2 =
    baseloadWPerM2 + LIGHTING_POWER_W_PER_M2 + PLUGS_POWER_W_PER_M2_AT_NOMINAL_OCCUPANCY;
  return {
    baseloadWPerM2,
    nightWPerM2: Math.max(
      baseloadWPerM2,
      (nightBaseload?.nightToDayPowerRatio ?? 0) * dayPlateauWPerM2,
    ),
  };
}

/** Working days 7:30–19:30: baseload + lighting + plugs following occupancy; otherwise night level (+ weekend lights). */
export function getLightingPlugsPowerWPerM2(
  clock: StepClock,
  occupancyRatio: number,
  lightingPlugs: LightingPlugsSettings,
): number {
  const isOpen = !clock.isWeekend && clock.hour >= OPENING_HOUR && clock.hour < CLOSING_HOUR;
  if (isOpen) {
    return (
      lightingPlugs.baseloadWPerM2 +
      LIGHTING_POWER_W_PER_M2 +
      (PLUGS_POWER_W_PER_M2_AT_NOMINAL_OCCUPANCY * occupancyRatio) / NOMINAL_OCCUPANCY_RATE
    );
  }
  return lightingPlugs.nightWPerM2 + getWeekendLightingWPerM2(clock);
}

function getWeekendLightingWPerM2(clock: StepClock): number {
  return clock.isWeekend &&
    clock.hour >= WEEKEND_LIGHTING_START_HOUR &&
    clock.hour < WEEKEND_LIGHTING_END_HOUR
    ? WEEKEND_LIGHTING_POWER_W_PER_M2
    : 0;
}
