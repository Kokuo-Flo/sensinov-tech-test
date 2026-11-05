import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { problemOf } from '#testing/data-problem';

import { EquipmentDao } from './equipment.dao';

describe('EquipmentDao', () => {
  let dao: EquipmentDao;

  beforeEach(() => {
    dao = TestBed.inject(EquipmentDao);
  });

  it('should return an equipment by id', async () => {
    const equipment = await firstValueFrom(dao.getById('eq-paris-main-meter'));

    expect(equipment).toMatchObject({ id: 'eq-paris-main-meter', buildingId: 'bld-paris' });
  });

  it('should fail with a not-found problem for an unknown equipment', async () => {
    const problem = await problemOf(dao.getById('eq-x'));

    expect(problem).toMatchObject({ type: 'not-found', detail: 'eq-x' });
  });

  it('should return the whole data window by default', async () => {
    const series = await firstValueFrom(
      dao.getMeasurements('eq-paris-main-meter', 'active-energy'),
    );

    expect(series).toMatchObject({
      equipmentId: 'eq-paris-main-meter',
      metric: 'active-energy',
      unit: 'kWh',
      intervalMinutes: 15,
    });
    expect(series.points).toHaveLength(5376);
  });

  it('should return one day (96 points at 15 min) for a [from, to) day', async () => {
    const series = await firstValueFrom(
      dao.getMeasurements(
        'eq-paris-main-meter',
        'active-energy',
        '2026-10-05T00:00:00.000Z',
        '2026-10-06T00:00:00.000Z',
      ),
    );

    expect(series.points).toHaveLength(96);
    expect(series.points.at(-1)?.timestamp).toBe('2026-10-05T23:45:00.000Z');
  });

  it('should keep only the points from `from` to the end of the window when `to` is omitted', async () => {
    const series = await firstValueFrom(
      dao.getMeasurements('eq-paris-main-meter', 'active-energy', '2026-11-01T00:00:00.000Z'),
    );

    expect(series.points).toHaveLength(96);
  });

  it('should return an empty series for a range outside the window', async () => {
    const series = await firstValueFrom(
      dao.getMeasurements(
        'eq-paris-main-meter',
        'active-energy',
        '2030-01-01T00:00:00.000Z',
        '2030-01-02T00:00:00.000Z',
      ),
    );

    expect(series.points).toEqual([]);
    expect(series.metric).toBe('active-energy');
  });

  it('should fail with a not-found problem for the measurements of an unknown equipment', async () => {
    const problem = await problemOf(dao.getMeasurements('eq-x', 'active-energy'));

    expect(problem).toMatchObject({ type: 'not-found', detail: 'eq-x' });
  });

  it('should fail with an invalid-metric problem for a metric the equipment does not report', async () => {
    const problem = await problemOf(dao.getMeasurements('eq-paris-main-meter', 'hvac-status'));

    expect(problem.type).toBe('invalid-metric');
  });
});
