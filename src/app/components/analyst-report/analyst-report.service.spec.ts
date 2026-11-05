import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { ReportDao } from '#dao/report.dao';
import { makeBuilding, makeReport } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { settle } from '#testing/settle';

import { AnalystReportService } from './analyst-report.service';

const REPORT = makeReport({
  recommendations: [
    { id: 'r1', buildingId: null, title: 'Parc', description: 'd' },
    { id: 'r2', buildingId: 'bld-warsaw', title: 'Varsovie', description: 'd' },
    { id: 'r3', buildingId: 'bld-unknown', title: 'Inconnu', description: 'd' },
  ],
});

function setup(
  reports: ReturnType<ReportDao['getAll']>,
  buildings: ReturnType<BuildingDao['getAll']>,
): AnalystReportService {
  TestBed.configureTestingModule({
    providers: [
      provideServiceMock(ReportDao, { getAll: () => reports }),
      provideServiceMock(BuildingDao, { getAll: () => buildings }),
    ],
  });
  return TestBed.inject(AnalystReportService);
}

function buildingNames(service: AnalystReportService): [string, string | null][] {
  return (service.reports()[0]?.recommendations ?? []).map((r) => [r.id, r.buildingName]);
}

describe('AnalystReportService', () => {
  it('should name the building of each recommendation, null when portfolio-wide', async () => {
    const service = setup(
      of([REPORT]),
      of([makeBuilding({ id: 'bld-warsaw', name: 'Varsovie HQ' })]),
    );

    await settle();

    expect(buildingNames(service)).toEqual([
      ['r1', null],
      ['r2', 'Varsovie HQ'],
      ['r3', 'bld-unknown'],
    ]);
  });

  it('should fall back to the building id when buildings are unavailable', async () => {
    const service = setup(
      of([REPORT]),
      throwError(() => new Error('down')),
    );

    await settle();

    expect(buildingNames(service)).toEqual([
      ['r1', null],
      ['r2', 'bld-warsaw'],
      ['r3', 'bld-unknown'],
    ]);
    expect(service.problem()).toBeNull();
  });

  it('should expose a problem only from the reports request', async () => {
    const service = setup(
      throwError(() => new Error('down')),
      of([]),
    );

    await settle();

    expect(service.problem()?.type).toBe('unknown-error');
    expect(service.reports()).toEqual([]);
  });

  it('should be loading while reports are pending', async () => {
    const service = setup(NEVER, of([]));

    await settle();

    expect(service.isLoading()).toBe(true);
  });

  it('should expose no report when none is published', async () => {
    const service = setup(of([]), of([]));

    await settle();

    expect(service.reports()).toEqual([]);
    expect(service.isLoading()).toBe(false);
  });
});
