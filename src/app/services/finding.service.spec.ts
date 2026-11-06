import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { EquipmentDao } from '#dao/equipment.dao';
import { type Equipment } from '#models/equipment.model';
import { getMeasurementPeriodRange } from '#models/measurement-period.model';
import { type MeasurementSeries } from '#models/measurement.model';
import { notFound } from '#utils/data-problem.utils';
import { makeBuilding, makeEquipment, makePoint, makeSeries } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { settle } from '#testing/settle';

import { FindingService } from './finding.service';

const START_MS = Date.parse('2026-09-07T00:00:00.000Z');
const QUARTER_HOUR_MS = 900_000;

/** A 24 h run of one identical temperature reading: a frozen sensor. */
function frozenSeries(equipmentId: string): MeasurementSeries {
  return makeSeries({
    equipmentId,
    metric: 'indoor-temperature',
    unit: '°C',
    points: Array.from({ length: 96 }, (_: unknown, index: number) =>
      makePoint(new Date(START_MS + index * QUARTER_HOUR_MS).toISOString(), 21),
    ),
  });
}

function temperatureSensor(id: string, buildingId: string): Equipment {
  return makeEquipment({
    id,
    buildingId,
    type: 'temperature-sensor',
    meterScope: null,
    metrics: [{ key: 'indoor-temperature', unit: '°C' }],
  });
}

const ALPHA = makeBuilding({ id: 'bld-alpha', name: 'Alpha' });
const BETA = makeBuilding({ id: 'bld-beta', name: 'Beta' });
const SENSOR_A1 = temperatureSensor('eq-a1', 'bld-alpha');
const SENSOR_A2 = temperatureSensor('eq-a2', 'bld-alpha');

function setup(daos: { buildingDao?: Partial<BuildingDao>; equipmentDao?: Partial<EquipmentDao> }) {
  TestBed.configureTestingModule({
    providers: [
      provideServiceMock(BuildingDao, daos.buildingDao),
      provideServiceMock(EquipmentDao, daos.equipmentDao),
    ],
  });
  return TestBed.inject(FindingService);
}

describe('FindingService', () => {
  const getMeasurements = vi.fn((equipmentId: string) => of(frozenSeries(equipmentId)));
  const getAll = vi.fn(() => of([ALPHA, BETA]));
  const getEquipments = vi.fn((buildingId: string) =>
    of(buildingId === 'bld-alpha' ? [SENSOR_A1, SENSOR_A2] : []),
  );

  beforeEach(() => {
    getMeasurements.mockClear();
    getAll.mockClear();
    getEquipments.mockClear();
  });

  it('should detect the findings of every building from the series loaded once', async () => {
    const service = setup({
      buildingDao: { getAll, getEquipments },
      equipmentDao: { getMeasurements },
    });

    await settle();

    expect(service.findings().map((finding) => finding.id).sort()).toEqual([
      'frozen-sensor:bld-alpha:eq-a1',
      'frozen-sensor:bld-alpha:eq-a2',
    ]);
    expect(service.buildings().map((building) => building.id)).toEqual(['bld-alpha', 'bld-beta']);
    expect(service.equipments().map((equipment) => equipment.id)).toEqual(['eq-a1', 'eq-a2']);
    expect(service.problem()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('should read every metric over the 8-week window', async () => {
    const { from, to } = getMeasurementPeriodRange('8-weeks');
    setup({ buildingDao: { getAll, getEquipments }, equipmentDao: { getMeasurements } });

    await settle();

    expect(getMeasurements).toHaveBeenCalledWith('eq-a1', 'indoor-temperature', from, to);
    expect(getMeasurements).toHaveBeenCalledWith('eq-a2', 'indoor-temperature', from, to);
    expect(getMeasurements).toHaveBeenCalledTimes(2);
  });

  it('should compute once and serve later reads from the cache', async () => {
    const service = setup({
      buildingDao: { getAll, getEquipments },
      equipmentDao: { getMeasurements },
    });

    await settle();
    service.findings();
    service.findingCountByBuilding();
    await settle();

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getMeasurements).toHaveBeenCalledTimes(2);
  });

  it('should count findings per building and omit a building without finding', async () => {
    const service = setup({
      buildingDao: { getAll, getEquipments },
      equipmentDao: { getMeasurements },
    });

    await settle();

    expect(service.findingCountByBuilding().get('bld-alpha')).toBe(2);
    expect(service.findingCountByBuilding().has('bld-beta')).toBe(false);
  });

  it('should list a building without equipment with no finding', async () => {
    const service = setup({
      buildingDao: { getAll: () => of([BETA]), getEquipments },
      equipmentDao: { getMeasurements },
    });

    await settle();

    expect(service.buildings().map((building) => building.id)).toEqual(['bld-beta']);
    expect(service.findings()).toEqual([]);
    expect(service.equipments()).toEqual([]);
  });

  it('should expose empty lists when there is no building', async () => {
    const service = setup({
      buildingDao: { getAll: () => of([]), getEquipments },
      equipmentDao: { getMeasurements },
    });

    await settle();

    expect(service.buildings()).toEqual([]);
    expect(service.findings()).toEqual([]);
    expect(service.problem()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('should be loading while the buildings are pending', async () => {
    const service = setup({ buildingDao: { getAll: () => NEVER, getEquipments } });

    await settle();

    expect(service.isLoading()).toBe(true);
    expect(service.findings()).toEqual([]);
  });

  it('should expose the problem when a measurement read fails', async () => {
    const service = setup({
      buildingDao: { getAll, getEquipments },
      equipmentDao: { getMeasurements: () => throwError(() => notFound('Equipment', 'eq-a1')) },
    });

    await settle();

    expect(service.problem()?.type).toBe('not-found');
    expect(service.findings()).toEqual([]);
    expect(service.buildings()).toEqual([]);
  });

  it('should expose an unknown-error problem when the buildings cannot be listed', async () => {
    const service = setup({
      buildingDao: { getAll: () => throwError(() => new Error('down')), getEquipments },
    });

    await settle();

    expect(service.problem()).toEqual({ type: 'unknown-error', title: 'Unknown error', detail: 'down' });
    expect(service.findingCountByBuilding().size).toBe(0);
  });
});
