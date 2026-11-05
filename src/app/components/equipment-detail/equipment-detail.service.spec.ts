import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { EquipmentDao } from '#dao/equipment.dao';
import { MEASUREMENT_REFERENCE_INSTANT } from '#models/measurement-period.model';
import { makeBuilding, makeEquipment, makePoint, makeSeries } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { notFound } from '#utils/data-problem.utils';
import { settle } from '#testing/settle';

import { EquipmentDetailService } from './equipment-detail.service';

const TWO_METRICS = makeEquipment({
  metrics: [
    { key: 'active-energy', unit: 'kWh' },
    { key: 'hvac-status', unit: 'on/off' },
  ],
});

function setup(
  equipmentOverrides: Partial<EquipmentDao> = {},
  buildingOverrides: Partial<BuildingDao> = {},
): { service: EquipmentDetailService; equipmentDao: EquipmentDao } {
  TestBed.configureTestingModule({
    providers: [
      EquipmentDetailService,
      provideServiceMock(EquipmentDao, {
        getById: vi.fn(() => of(TWO_METRICS)),
        getMeasurements: vi.fn((_id: string, metric: string) =>
          of(makeSeries({ unit: metric === 'active-energy' ? 'kWh' : 'on/off' })),
        ),
        ...equipmentOverrides,
      }),
      provideServiceMock(BuildingDao, {
        getById: vi.fn(() => of(makeBuilding({ name: 'Varsovie' }))),
        ...buildingOverrides,
      }),
    ],
  });
  return {
    service: TestBed.inject(EquipmentDetailService),
    equipmentDao: TestBed.inject(EquipmentDao),
  };
}

describe('EquipmentDetailService', () => {
  it('should load nothing before connect', async () => {
    const { service, equipmentDao } = setup();

    await settle();

    expect(service.equipment()).toBeNull();
    expect(service.selectedMetric()).toBeNull();
    expect(service.metrics()).toEqual([]);
    expect(equipmentDao.getById).not.toHaveBeenCalled();
    expect(equipmentDao.getMeasurements).not.toHaveBeenCalled();
  });

  it('should select the first metric and request the default period', async () => {
    const { service, equipmentDao } = setup();

    service.connect(signal('eq-1'));
    await settle();

    expect(service.selectedMetric()).toBe('active-energy');
    expect(service.selectedPeriod()).toBe('7-days');
    expect(service.hasSeveralMetrics()).toBe(true);
    expect(equipmentDao.getMeasurements).toHaveBeenCalledWith(
      'eq-1',
      'active-energy',
      '2026-10-26T00:00:00.000Z',
      MEASUREMENT_REFERENCE_INSTANT,
    );
  });

  it('should have a single metric flagged as not several', async () => {
    const { service } = setup({ getById: vi.fn(() => of(makeEquipment())) });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.hasSeveralMetrics()).toBe(false);
  });

  it('should re-request the series with the selected metric', async () => {
    const { service, equipmentDao } = setup();
    service.connect(signal('eq-1'));
    await settle();

    service.selectMetric('hvac-status');
    await settle();

    expect(service.selectedMetric()).toBe('hvac-status');
    expect(service.unit()).toBe('on/off');
    expect(equipmentDao.getMeasurements).toHaveBeenLastCalledWith(
      'eq-1',
      'hvac-status',
      '2026-10-26T00:00:00.000Z',
      MEASUREMENT_REFERENCE_INSTANT,
    );
  });

  it.each([
    ['4-weeks', '2026-10-05T00:00:00.000Z'],
    ['8-weeks', '2026-09-07T00:00:00.000Z'],
  ] as const)('should anchor the %s period on the reference instant', async (period, from) => {
    const { service, equipmentDao } = setup();
    service.connect(signal('eq-1'));
    await settle();

    service.selectPeriod(period);
    await settle();

    expect(service.selectedPeriod()).toBe(period);
    expect(equipmentDao.getMeasurements).toHaveBeenLastCalledWith(
      'eq-1',
      'active-energy',
      from,
      MEASUREMENT_REFERENCE_INSTANT,
    );
  });

  it('should reset the metric when the equipment changes', async () => {
    const { service } = setup({
      getById: vi.fn((id: string) =>
        of(
          id === 'eq-1'
            ? TWO_METRICS
            : makeEquipment({ id, metrics: [{ key: 'indoor-temperature', unit: '°C' }] }),
        ),
      ),
    });
    const id = signal('eq-1');
    service.connect(id);
    await settle();
    service.selectMetric('hvac-status');
    await settle();

    id.set('eq-2');
    await settle();

    expect(service.selectedMetric()).toBe('indoor-temperature');
  });

  it('should expose the series points, unit and non-empty flag', async () => {
    const points = [
      makePoint('2026-10-30T00:00:00.000Z', 1),
      makePoint('2026-10-30T00:15:00.000Z', null),
    ];
    const { service } = setup({
      getMeasurements: vi.fn(() => of(makeSeries({ unit: 'kWh', points }))),
    });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.points()).toEqual(points);
    expect(service.unit()).toBe('kWh');
    expect(service.isSeriesEmpty()).toBe(false);
  });

  it('should flag an empty series', async () => {
    const { service } = setup();

    service.connect(signal('eq-1'));
    await settle();

    expect(service.isSeriesEmpty()).toBe(true);
    expect(service.latestPoints()).toEqual([]);
  });

  it('should keep the 48 latest points, most recent first', async () => {
    const points = Array.from({ length: 60 }, (_: unknown, index: number) =>
      makePoint(new Date(Date.UTC(2026, 9, 30, 0, index)).toISOString(), index),
    );
    const { service } = setup({
      getMeasurements: vi.fn(() => of(makeSeries({ points }))),
    });

    service.connect(signal('eq-1'));
    await settle();

    const latest = service.latestPoints();
    expect(latest).toHaveLength(48);
    expect(latest.map((p) => p.value).slice(0, 2)).toEqual([59, 58]);
    expect(latest.at(-1)?.value).toBe(12);
  });

  it('should label the building by its name', async () => {
    const { service } = setup();

    service.connect(signal('eq-1'));
    await settle();

    expect(service.buildingLabel()).toBe('Varsovie');
  });

  it('should label the building by its id when the lookup fails', async () => {
    const { service } = setup({}, { getById: vi.fn(() => throwError(() => new Error('down'))) });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.buildingLabel()).toBe('bld-warsaw');
    expect(service.problem()).toBeNull();
  });

  it('should have an empty building label before the equipment is known', () => {
    const { service } = setup();

    expect(service.buildingLabel()).toBe('');
  });

  it('should expose a problem when the equipment is not found', async () => {
    const missing = notFound('Equipment', 'missing');
    const { service, equipmentDao } = setup({ getById: vi.fn(() => throwError(() => missing)) });

    service.connect(signal('missing'));
    await settle();

    expect(service.problem()?.type).toBe('not-found');
    expect(service.equipment()).toBeNull();
    expect(equipmentDao.getMeasurements).not.toHaveBeenCalled();
  });

  it('should separate a series problem from the equipment problem', async () => {
    const { service } = setup({
      getMeasurements: vi.fn(() => throwError(() => new Error('down'))),
    });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.problem()).toBeNull();
    expect(service.equipment()?.id).toBe('eq-1');
    expect(service.seriesProblem()?.type).toBe('unknown-error');
    expect(service.points()).toEqual([]);
  });

  it('should be loading while the equipment is pending', async () => {
    const { service } = setup({ getById: vi.fn(() => NEVER) });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.isLoading()).toBe(true);
  });

  it('should flag the series as loading while its request is pending', async () => {
    const { service } = setup({ getMeasurements: vi.fn(() => NEVER) });

    service.connect(signal('eq-1'));
    await settle();

    expect(service.isSeriesLoading()).toBe(true);
    expect(service.isLoading()).toBe(false);
  });
});
