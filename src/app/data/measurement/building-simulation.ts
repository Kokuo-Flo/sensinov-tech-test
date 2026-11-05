import { SeededRandom, seedFromText } from '#data/utils/seeded-random';
import { type BuildingStep } from '#models/building-simulation.model';
import { type Building } from '#models/building.model';

import { BASE_STEP_COUNT, getStepClock } from './clock';
import { getHvacPowerWPerM2, getHvacSettings, isHvacRunning } from './hvac';
import {
  getFreeFloatingTemperatureCelsius,
  getNextIndoorTemperatureCelsius,
  getSolarGainCelsius,
} from './indoor-temperature';
import {
  drawLightingBaseloadWPerM2,
  getLightingPlugsPowerWPerM2,
  getLightingPlugsSettings,
} from './lighting-plugs';
import {
  drawDailyAttendanceFactors,
  getOccupancyRatio,
  getPlateauOccupancyRate,
} from './occupancy';
import {
  drawDailyWeatherDeviations,
  getClimateOffsetCelsius,
  getOutdoorTemperatureCelsius,
} from './outdoor-climate';

/** Uses not sub-metered (lifts, IT rooms, hot water): a share of the metered uses plus a fixed baseload. */
const RESIDUAL_SHARE = 0.03;
const RESIDUAL_POWER_W_PER_M2 = 0.8;

const buildingStepsCache = new Map<string, readonly BuildingStep[]>();

/** Physical state of `building` on every 15-min step of the window, simulated once then memoized. */
export function getBuildingSteps(building: Building): readonly BuildingStep[] {
  const cached = buildingStepsCache.get(building.id);
  if (cached !== undefined) {
    return cached;
  }
  const steps = simulateBuilding(building);
  buildingStepsCache.set(building.id, steps);
  return steps;
}

function simulateBuilding(building: Building): BuildingStep[] {
  // The draw order (weather, attendance, lighting baseload) is part of the dataset: changing it changes every value.
  const random = new SeededRandom(seedFromText(building.id));
  const weatherDeviations = drawDailyWeatherDeviations(random);
  const attendanceFactors = drawDailyAttendanceFactors(random);
  const lightingBaseloadWPerM2 = drawLightingBaseloadWPerM2(random);

  const climateOffsetCelsius = getClimateOffsetCelsius(building.id);
  const plateauOccupancyRate = getPlateauOccupancyRate(building.id);
  const hvac = getHvacSettings(building);
  const lightingPlugs = getLightingPlugsSettings(building.id, lightingBaseloadWPerM2);

  // Indoor temperature is the only state carried from one step to the next (thermal inertia).
  let indoorTemperatureCelsius = hvac.setpointCelsius;
  return Array.from({ length: BASE_STEP_COUNT }, (_: unknown, stepIndex: number) => {
    const clock = getStepClock(stepIndex);
    const outdoorCelsius = getOutdoorTemperatureCelsius(
      clock,
      climateOffsetCelsius,
      weatherDeviations[clock.dayIndex] ?? 0,
    );
    const occupancyRatio = getOccupancyRatio(
      clock,
      plateauOccupancyRate,
      attendanceFactors[clock.dayIndex] ?? 1,
    );
    const isHvacOn = isHvacRunning(clock, hvac);

    indoorTemperatureCelsius = getNextIndoorTemperatureCelsius(
      indoorTemperatureCelsius,
      isHvacOn
        ? hvac.setpointCelsius
        : getFreeFloatingTemperatureCelsius(outdoorCelsius, occupancyRatio),
      isHvacOn,
    );
    const hvacPowerW =
      getHvacPowerWPerM2(clock, isHvacOn, outdoorCelsius, hvac) * building.surfaceM2;
    const lightingPlugsPowerW =
      getLightingPlugsPowerWPerM2(clock, occupancyRatio, lightingPlugs) * building.surfaceM2;

    return {
      occupancyCount: occupancyRatio * building.occupancyCapacity,
      hvacOn: isHvacOn ? 1 : 0,
      setpointCelsius: hvac.setpointCelsius,
      indoorTemperatureCelsius,
      solarGainCelsius: getSolarGainCelsius(clock.hour),
      hvacPowerW,
      lightingPlugsPowerW,
      mainPowerW: getMainPowerW(hvacPowerW, lightingPlugsPowerW, building.surfaceM2),
    };
  });
}

/** Main meter = HVAC + lighting & plugs + residual uses. */
function getMainPowerW(hvacPowerW: number, lightingPlugsPowerW: number, surfaceM2: number): number {
  return (
    (hvacPowerW + lightingPlugsPowerW) * (1 + RESIDUAL_SHARE) + RESIDUAL_POWER_W_PER_M2 * surfaceM2
  );
}
