import { type AnalystReport } from '#models/analyst-report.model';
import { type Building } from '#models/building.model';
import { type Equipment } from '#models/equipment.model';
import { type MeasurementPoint, type MeasurementSeries } from '#models/measurement.model';

export function makeBuilding(overrides: Partial<Building> = {}): Building {
  return {
    id: 'bld-warsaw',
    name: 'Varsovie',
    city: 'Varsovie',
    countryCode: 'PL',
    surfaceM2: 12500,
    constructionYear: 1998,
    floors: 6,
    occupancyCapacity: 400,
    baselineAnnualEnergyKwh: 1_000_000,
    ...overrides,
  };
}

export function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1',
    buildingId: 'bld-warsaw',
    name: 'CPT-CVC-01',
    type: 'energy-meter',
    vendor: 'Acme',
    zone: 'Hall',
    meterScope: 'hvac',
    samplingIntervalMinutes: 15,
    metrics: [{ key: 'active-energy', unit: 'kWh' }],
    ...overrides,
  };
}

export function makePoint(timestamp: string, value: number | null): MeasurementPoint {
  return { timestamp, value };
}

export function makeSeries(overrides: Partial<MeasurementSeries> = {}): MeasurementSeries {
  return {
    equipmentId: 'eq-1',
    metric: 'active-energy',
    unit: 'kWh',
    intervalMinutes: 15,
    points: [],
    ...overrides,
  };
}

export function makeReport(overrides: Partial<AnalystReport> = {}): AnalystReport {
  return {
    id: 'rep-1',
    title: 'Rapport T3',
    author: 'Alice Martin',
    publishedAt: '2026-10-15T00:00:00.000Z',
    recommendations: [],
    ...overrides,
  };
}
