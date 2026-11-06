import { type AnalystReport } from '#models/analyst-report.model';
import { type Building } from '#models/building.model';
import { type Country } from '#models/country.model';
import { type Finding, getFindingCategory, getFindingId } from '#models/finding.model';
import { type ImpactEstimate } from '#models/impact.model';
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

export function makeFinding(overrides: Partial<Finding> = {}): Finding {
  const kind = overrides.kind ?? 'weekend-hvac';
  const buildingId = overrides.buildingId ?? 'bld-warsaw';
  return {
    id: getFindingId(kind, buildingId),
    kind,
    category: getFindingCategory(kind),
    buildingId,
    firstSeenAt: '2026-09-07T00:00:00.000Z',
    lastSeenAt: '2026-10-30T22:45:00.000Z',
    occurrences: 10,
    observed: 10,
    reference: 16,
    unit: 'days',
    evidence: [{ equipmentId: 'eq-1', metric: 'hvac-status' }],
    excessEnergyKwh: 1000,
    ...overrides,
  };
}

export function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    code: 'PL',
    name: 'Pologne',
    gridEmissionFactorKgCo2ePerKwh: 0.5,
    electricityPriceEurPerKwh: 0.2,
    ...overrides,
  };
}

export function makeImpact(overrides: Partial<ImpactEstimate> = {}): ImpactEstimate {
  return {
    findingId: 'weekend-hvac:bld-warsaw',
    annualEnergyKwh: 1000,
    annualCostEur: 200,
    annualEmissionsKgCo2e: 500,
    confidence: 'high',
    ...overrides,
  };
}
