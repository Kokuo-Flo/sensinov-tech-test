/**
 * Connected device installed in a building (meter, air handling unit, sensor) and the metrics it reports.
 * Shown on the building and equipment pages, read by the detection rules.
 */

/** Kind of device. */
export const EQUIPMENT_TYPES = [
  'energy-meter',
  'hvac-unit',
  'occupancy-sensor',
  'temperature-sensor',
] as const;

/**
 * Perimeter an energy meter measures: `'main'` = whole building, `'hvac'` = heating / ventilation /
 * air-conditioning sub-meter, `'lighting-plugs'` = lighting and plug loads sub-meter.
 */
export const METER_SCOPES = ['main', 'hvac', 'lighting-plugs'] as const;

/**
 * Physical quantities an equipment can report: `'active-energy'` (energy over the interval),
 * `'hvac-status'` (on/off), `'heating-setpoint'` (°C), `'occupancy-count'` (persons),
 * `'indoor-temperature'` (°C).
 */
export const METRIC_KEYS = [
  'active-energy',
  'hvac-status',
  'heating-setpoint',
  'occupancy-count',
  'indoor-temperature',
] as const;

/** Interval between two readings of an equipment, minutes. */
export const SAMPLING_INTERVALS_MINUTES = [15, 60] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export type MeterScope = (typeof METER_SCOPES)[number];

export type MetricKey = (typeof METRIC_KEYS)[number];

export type SamplingIntervalMinutes = (typeof SAMPLING_INTERVALS_MINUTES)[number];

/** One metric reported by an equipment, with the unit its vendor sends it in. */
export interface MetricDefinition {
  readonly key: MetricKey;
  /** Vendor unit, as received: `'kWh'`, `'Wh'`, `'°C'`, `'pers.'` or `'on/off'`. */
  readonly unit: string;
}

export interface Equipment {
  /** Stable slug, e.g. `'eq-warsaw-hvac-meter'`. */
  readonly id: string;
  readonly buildingId: string;
  /** Vendor-style label: `'CPT-CVC-01'`, `'AHU_North'`… */
  readonly name: string;

  readonly type: EquipmentType;
  /** Fictional vendor; each vendor has its own naming, unit and sampling habits. */
  readonly vendor: string;
  /** Location in the building (`'Nord'`, `'Toiture'`…); `null` for meters, which cover the whole building. */
  readonly zone: string | null;
  /** Perimeter measured; set for energy meters only, `null` otherwise. */
  readonly meterScope: MeterScope | null;

  readonly samplingIntervalMinutes: SamplingIntervalMinutes;
  readonly metrics: readonly MetricDefinition[];
}

export function isMetricKey(value: string): value is MetricKey {
  return METRIC_KEYS.some((key: MetricKey) => key === value);
}

/** Metric definition of `equipment` for `metric`, or `null` when the equipment does not report it. */
export function findMetricDefinition(
  equipment: Equipment,
  metric: MetricKey,
): MetricDefinition | null {
  return (
    equipment.metrics.find((definition: MetricDefinition) => definition.key === metric) ?? null
  );
}
