import { findSeriesDefects } from '#data/anomalies.data';
import { findBuilding } from '#data/building.data';
import { SeededRandom, seedFromText } from '#data/utils/seeded-random';
import { type BuildingStep } from '#models/building-simulation.model';
import { type Equipment, type MetricDefinition, type MetricKey } from '#models/equipment.model';
import { type MeasurementPoint, type MeasurementSeries } from '#models/measurement.model';

import { getBuildingSteps } from './building-simulation';
import {
  BASE_STEP_HOURS,
  BASE_STEP_MINUTES,
  MS_PER_MINUTE,
  WINDOW_END_MS,
  WINDOW_START_MS,
} from './clock';
import { applyDataQualityDefects } from './data-quality';
import { getZoneTemperatureCelsius } from './indoor-temperature';

const W_PER_KW = 1_000;
const WH_PER_KWH = 1_000;
/** Sensor accuracy: ±3 % on energy meters, ±5 % (at least 1 person) on people counters, ±0.15 °C on thermometers. */
const ENERGY_NOISE_SHARE = 0.03;
const OCCUPANCY_NOISE_SHARE = 0.05;
const MIN_OCCUPANCY_NOISE_PERSONS = 1;
const TEMPERATURE_NOISE_CELSIUS = 0.15;

type Aggregation = 'sum' | 'mean';

const seriesCache = new Map<string, MeasurementSeries>();

/** Full-window series of `equipment` for `definition`, memoized. */
export function generateMeasurementSeries(
  equipment: Equipment,
  definition: MetricDefinition,
): MeasurementSeries {
  const cacheKey = `${equipment.id}:${definition.key}`;
  const cached = seriesCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const series: MeasurementSeries = {
    equipmentId: equipment.id,
    metric: definition.key,
    unit: definition.unit,
    intervalMinutes: equipment.samplingIntervalMinutes,
    points: buildPoints(equipment, definition),
  };
  seriesCache.set(cacheKey, series);
  return series;
}

/** Points of `series` whose timestamp lies in `[fromMs, toMs)`; bounds are clamped to the window. */
export function selectSeriesRange(
  series: MeasurementSeries,
  fromMs: number,
  toMs: number,
): MeasurementSeries {
  const intervalMs = series.intervalMinutes * MS_PER_MINUTE;
  const clampedFromMs = Math.min(Math.max(fromMs, WINDOW_START_MS), WINDOW_END_MS);
  const clampedToMs = Math.min(Math.max(toMs, WINDOW_START_MS), WINDOW_END_MS);
  const startIndex = Math.ceil((clampedFromMs - WINDOW_START_MS) / intervalMs);
  const endIndex = Math.ceil((clampedToMs - WINDOW_START_MS) / intervalMs);
  return { ...series, points: series.points.slice(startIndex, Math.max(startIndex, endIndex)) };
}

/**
 * What the equipment reports: the building state read through the equipment (scope, zone), aggregated to its
 * sampling interval (energy summed, others averaged), with sensor noise, vendor unit and rounding, then defects.
 */
function buildPoints(equipment: Equipment, definition: MetricDefinition): MeasurementPoint[] {
  const building = findBuilding(equipment.buildingId);
  if (building === null) {
    throw new Error(`Unknown building ${equipment.buildingId}`);
  }
  const steps = getBuildingSteps(building);
  // One noise sequence per series, drawn once per point in chronological order (defect periods included).
  const random = new SeededRandom(seedFromText(`${equipment.id}:${definition.key}`));
  const stepsPerPoint = equipment.samplingIntervalMinutes / BASE_STEP_MINUTES;
  const intervalMs = equipment.samplingIntervalMinutes * MS_PER_MINUTE;
  const readTrueValue = getTrueValueReader(equipment, definition.key);
  const aggregation: Aggregation = definition.key === 'active-energy' ? 'sum' : 'mean';
  const defects = findSeriesDefects(equipment.id, definition.key);

  return chunk(steps, stepsPerPoint).map(
    (pointSteps: readonly BuildingStep[], pointIndex: number) => {
      const timestampMs = WINDOW_START_MS + pointIndex * intervalMs;
      const trueValue = aggregate(pointSteps.map(readTrueValue), aggregation);
      const measuredValue = applySensorNoise(trueValue, definition.key, random);
      const value = toVendorValue(measuredValue, definition);
      return {
        timestamp: new Date(timestampMs).toISOString(),
        value: applyDataQualityDefects(value, timestampMs, defects),
      };
    },
  );
}

/** Physical value of the metric at one base step, as seen by `equipment` (energy in kWh per step). */
function getTrueValueReader(
  equipment: Equipment,
  metric: MetricKey,
): (step: BuildingStep) => number {
  switch (metric) {
    case 'active-energy':
      return (step: BuildingStep) =>
        (getMeteredPowerW(step, equipment) * BASE_STEP_HOURS) / W_PER_KW;
    case 'hvac-status':
      return (step: BuildingStep) => step.hvacOn;
    case 'heating-setpoint':
      return (step: BuildingStep) => step.setpointCelsius;
    case 'occupancy-count':
      return (step: BuildingStep) => step.occupancyCount;
    case 'indoor-temperature':
      return (step: BuildingStep) => getZoneTemperatureCelsius(step, equipment.zone);
  }
}

/** Power flowing through the meter: its sub-metered scope, or the whole building for the main meter. */
function getMeteredPowerW(step: BuildingStep, equipment: Equipment): number {
  switch (equipment.meterScope) {
    case 'hvac':
      return step.hvacPowerW;
    case 'lighting-plugs':
      return step.lightingPlugsPowerW;
    case 'main':
    case null:
      return step.mainPowerW;
  }
}

/** Measurement noise of the sensor; status and setpoint are command values, read without noise. */
function applySensorNoise(value: number, metric: MetricKey, random: SeededRandom): number {
  switch (metric) {
    case 'active-energy':
      return value * (1 + random.noise(ENERGY_NOISE_SHARE));
    case 'occupancy-count':
      return Math.max(
        0,
        value + random.noise(Math.max(MIN_OCCUPANCY_NOISE_PERSONS, value * OCCUPANCY_NOISE_SHARE)),
      );
    case 'indoor-temperature':
      return value + random.noise(TEMPERATURE_NOISE_CELSIUS);
    case 'hvac-status':
    case 'heating-setpoint':
      return value;
  }
}

/** Unit and precision of the vendor payload: Wh as integers or kWh to 0.01, °C to 0.1, counts as integers. */
function toVendorValue(value: number, definition: MetricDefinition): number {
  switch (definition.key) {
    case 'active-energy':
      return definition.unit === 'Wh' ? Math.round(value * WH_PER_KWH) : roundTo(value, 2);
    case 'hvac-status':
    case 'occupancy-count':
      return Math.round(value);
    case 'heating-setpoint':
    case 'indoor-temperature':
      return roundTo(value, 1);
  }
}

function aggregate(values: readonly number[], aggregation: Aggregation): number {
  const total = values.reduce((sum: number, value: number) => sum + value, 0);
  return aggregation === 'sum' || values.length === 0 ? total : total / values.length;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_: unknown, chunkIndex: number) =>
    items.slice(chunkIndex * size, (chunkIndex + 1) * size),
  );
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
