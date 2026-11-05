import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { problemOf } from '#testing/data-problem';

import { BuildingDao } from './building.dao';

describe('BuildingDao', () => {
  let dao: BuildingDao;

  beforeEach(() => {
    dao = TestBed.inject(BuildingDao);
  });

  it('should return the 10 buildings of the dataset', async () => {
    const buildings = await firstValueFrom(dao.getAll());

    expect(buildings).toHaveLength(10);
    expect(buildings.find((b) => b.id === 'bld-paris')?.id).toBe('bld-paris');
  });

  it('should return a building by id', async () => {
    const building = await firstValueFrom(dao.getById('bld-lyon'));

    expect(building.id).toBe('bld-lyon');
    expect(building.city).toBe('Lyon');
  });

  it('should fail with a not-found problem for an unknown building', async () => {
    const problem = await problemOf(dao.getById('bld-x'));

    expect(problem).toMatchObject({ type: 'not-found', detail: 'bld-x' });
  });

  it('should return the 7 equipments of a building', async () => {
    const equipments = await firstValueFrom(dao.getEquipments('bld-paris'));

    expect(equipments).toHaveLength(7);
    expect(equipments.every((e) => e.buildingId === 'bld-paris')).toBe(true);
  });

  it('should fail with a not-found problem when listing the equipments of an unknown building', async () => {
    const problem = await problemOf(dao.getEquipments('bld-x'));

    expect(problem).toMatchObject({ type: 'not-found', detail: 'bld-x' });
  });
});
