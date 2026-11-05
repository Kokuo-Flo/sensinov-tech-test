export const EQUIPMENT_TYPES = [
  'energy-meter',
  'hvac-unit',
  'occupancy-sensor',
  'temperature-sensor',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const METER_SCOPES = ['main', 'hvac', 'lighting-plugs'] as const;
export type MeterScope = (typeof METER_SCOPES)[number];

export const METRIC_KEYS = [
  'active-energy',
  'hvac-status',
  'heating-setpoint',
  'occupancy-count',
  'indoor-temperature',
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const SAMPLING_INTERVALS_MINUTES = [15, 60] as const;
export type SamplingIntervalMinutes = (typeof SAMPLING_INTERVALS_MINUTES)[number];

export interface MetricDefinition {
  readonly key: MetricKey;
  /** Vendor unit, as received: `'kWh' | 'Wh' | '°C' | 'pers.' | 'on/off'`. */
  readonly unit: string;
}

export interface Equipment {
  /** e.g. `'eq-warsaw-hvac-meter'`. */
  readonly id: string;
  readonly buildingId: string;
  /** Vendor-style label: `'CPT-CVC-01'`, `'AHU_North'`… */
  readonly name: string;
  readonly type: EquipmentType;
  /** Fictional vendor. */
  readonly vendor: string;
  readonly zone: string | null;
  /** Energy meters only. */
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
