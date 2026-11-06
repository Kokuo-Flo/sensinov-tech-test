import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { type DataProblem } from '#models/data-problem.model';
import { FindingService } from '#services/finding.service';
import { makeBuilding, makeEquipment } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { notFound } from '#utils/data-problem.utils';
import { settle } from '#testing/settle';

import { BuildingDetailService } from './building-detail.service';

interface FindingState {
  readonly counts?: Map<string, number>;
  readonly isLoading?: boolean;
  readonly problem?: DataProblem | null;
}

function setup(
  overrides: Partial<BuildingDao> = {},
  findingState: FindingState = {},
): {
  service: BuildingDetailService;
  dao: BuildingDao;
} {
  TestBed.configureTestingModule({
    providers: [
      BuildingDetailService,
      provideServiceMock(FindingService, {
        findingCountByBuilding: signal(findingState.counts ?? new Map<string, number>()),
        isLoading: signal(findingState.isLoading ?? false),
        problem: signal(findingState.problem ?? null),
      }),
      provideServiceMock(BuildingDao, {
        getById: vi.fn((id: string) => of(makeBuilding({ id }))),
        getEquipments: vi.fn((id: string) =>
          of([makeEquipment({ id: `eq-${id}`, buildingId: id })]),
        ),
        ...overrides,
      }),
    ],
  });
  return { service: TestBed.inject(BuildingDetailService), dao: TestBed.inject(BuildingDao) };
}

describe('BuildingDetailService', () => {
  it('should load nothing before connect', async () => {
    const { service, dao } = setup();

    await settle();

    expect(service.building()).toBeNull();
    expect(service.equipments()).toEqual([]);
    expect(service.isLoading()).toBe(false);
    expect(dao.getById).not.toHaveBeenCalled();
  });

  it('should load the building and its equipments once connected', async () => {
    const { service, dao } = setup();

    service.connect(signal('bld-a'));
    await settle();

    expect(service.building()?.id).toBe('bld-a');
    expect(service.equipments().map((e) => e.id)).toEqual(['eq-bld-a']);
    expect(dao.getById).toHaveBeenCalledWith('bld-a');
    expect(dao.getEquipments).toHaveBeenCalledWith('bld-a');
    expect(service.problem()).toBeNull();
  });

  it('should reload when the building id changes', async () => {
    const { service, dao } = setup();
    const id = signal('bld-a');
    service.connect(id);
    await settle();

    id.set('bld-b');
    await settle();

    expect(service.building()?.id).toBe('bld-b');
    expect(service.equipments().map((e) => e.id)).toEqual(['eq-bld-b']);
    expect(dao.getById).toHaveBeenCalledWith('bld-b');
  });

  it('should be loading while a request is pending', async () => {
    const { service } = setup({ getById: () => NEVER });

    service.connect(signal('bld-a'));
    await settle();

    expect(service.isLoading()).toBe(true);
  });

  it('should expose a not-found problem when the DAO fails with notFound', async () => {
    const missing = notFound('Building', 'missing');
    const { service } = setup({
      getById: () => throwError(() => missing),
      getEquipments: () => throwError(() => missing),
    });

    service.connect(signal('missing'));
    await settle();

    expect(service.problem()?.type).toBe('not-found');
    expect(service.building()).toBeNull();
    expect(service.equipments()).toEqual([]);
  });

  it('should expose a problem when only the equipments fail', async () => {
    const { service } = setup({
      getEquipments: () => throwError(() => new Error('down')),
    });

    service.connect(signal('bld-a'));
    await settle();

    expect(service.problem()?.type).toBe('unknown-error');
  });
  describe('findingCount', () => {
    it('should be unknown before connect', async () => {
      const { service } = setup({}, { counts: new Map([['bld-a', 2]]) });

      await settle();

      expect(service.findingCount()).toBeNull();
    });

    it('should count the findings of the connected building', async () => {
      const { service } = setup({}, { counts: new Map([['bld-a', 2]]) });

      service.connect(signal('bld-a'));
      await settle();

      expect(service.findingCount()).toBe(2);
    });

    it('should be 0 for a building without finding', async () => {
      const { service } = setup({}, { counts: new Map([['bld-a', 2]]) });

      service.connect(signal('bld-b'));
      await settle();

      expect(service.findingCount()).toBe(0);
    });

    it('should be unknown while the detection runs', async () => {
      const { service } = setup({}, { counts: new Map([['bld-a', 2]]), isLoading: true });

      service.connect(signal('bld-a'));
      await settle();

      expect(service.findingCount()).toBeNull();
    });

    it('should be unknown when the detection failed', async () => {
      const { service } = setup(
        {},
        { counts: new Map([['bld-a', 2]]), problem: { type: 'unknown-error', title: 'x' } },
      );

      service.connect(signal('bld-a'));
      await settle();

      expect(service.findingCount()).toBeNull();
    });
  });
});
