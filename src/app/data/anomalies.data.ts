import { type MetricKey } from '#models/equipment.model';
import {
  type DataQualityDefect,
  type InjectedAnomaly,
  type InjectedAnomalyKind,
  isDataQualityDefect,
} from '#models/injected-anomaly.model';

/**
 * Ground truth of the injected wastes (A1–A5) and data-quality defects (DQ1–DQ2).
 * The measurement generator reads these parameters; no DAO exposes them — future detections
 * must find them from the measurements, tests use this const as the expected answer.
 *
 * Hours are local hours (UTC+1 approximation); ranges are ISO-8601 UTC, `[from, to)`.
 */
export const INJECTED_ANOMALIES: readonly InjectedAnomaly[] = [
  {
    code: 'A1',
    kind: 'weekend-hvac',
    buildingId: 'bld-warsaw',
    description:
      'HVAC runs on Saturdays and Sundays 8:00–18:00 with occupancy ≈ 0: hvac-status = 1 on weekends, ' +
      'weekend HVAC energy ≈ 70 % of a working day.',
    weekendStartHour: 8,
    weekendEndHour: 18,
    weekendToWeekdayEnergyRatio: 0.7,
  },
  {
    code: 'A2',
    kind: 'heating-setpoint',
    buildingId: 'bld-lyon',
    description:
      'Heating setpoint at 23 °C: heating-setpoint = 23, indoor temperature ≈ 23 °C, HVAC energy ≈ +14 %.',
    setpointCelsius: 23,
    hvacEnergyFactor: 1.14,
  },
  {
    code: 'A3',
    kind: 'night-baseload',
    buildingId: 'bld-madrid',
    description:
      'Lighting & plugs stay on at night: night power ≈ 60 % of the daytime power on the lighting & plugs sub-meter.',
    nightToDayPowerRatio: 0.6,
  },
  {
    code: 'A4',
    kind: 'early-hvac-start',
    buildingId: 'bld-berlin',
    description: 'HVAC starts at 4:00 instead of 7:00: hvac-status = 1 from 4:00 on working days.',
    weekdayStartHour: 4,
  },
  {
    code: 'A5',
    kind: 'low-occupancy',
    buildingId: 'bld-munich',
    description:
      'Occupancy at 30 % of capacity while the whole building is conditioned: occupancy ≈ 30 %, ' +
      'HVAC identical to a full building.',
    occupancyRate: 0.3,
  },
  {
    code: 'DQ1',
    kind: 'frozen-sensor',
    buildingId: 'bld-amsterdam',
    description:
      'North temperature sensor frozen for 5 days (October 12 → 16): constant value 21.4 °C.',
    equipmentId: 'eq-amsterdam-temp-north',
    metric: 'indoor-temperature',
    from: '2026-10-12T00:00:00.000Z',
    to: '2026-10-17T00:00:00.000Z',
    frozenValue: 21.4,
  },
  {
    code: 'DQ2',
    kind: 'missing-data',
    buildingId: 'bld-brussels',
    description: 'Main meter silent for 3 days (October 20 → 22): value null.',
    equipmentId: 'eq-brussels-main-meter',
    metric: 'active-energy',
    from: '2026-10-20T00:00:00.000Z',
    to: '2026-10-23T00:00:00.000Z',
  },
];

export function findBuildingAnomaly<Kind extends InjectedAnomalyKind>(
  buildingId: string,
  kind: Kind,
): Extract<InjectedAnomaly, { kind: Kind }> | null {
  const isMatch = (anomaly: InjectedAnomaly): anomaly is Extract<InjectedAnomaly, { kind: Kind }> =>
    anomaly.kind === kind && anomaly.buildingId === buildingId;
  return INJECTED_ANOMALIES.find(isMatch) ?? null;
}

/** Data-quality defects altering the series `equipmentId` × `metric`. */
export function findSeriesDefects(
  equipmentId: string,
  metric: MetricKey,
): readonly DataQualityDefect[] {
  return INJECTED_ANOMALIES.filter(isDataQualityDefect).filter(
    (defect: DataQualityDefect) => defect.equipmentId === equipmentId && defect.metric === metric,
  );
}
