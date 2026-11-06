import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Observable, NEVER, of, throwError } from 'rxjs';

import { ReportDao } from '#dao/report.dao';
import { ANALYST_REPORTS } from '#data/analyst-report.data';
import { type AnalystReport } from '#models/analyst-report.model';
import { type DataProblem } from '#models/data-problem.model';
import { type Finding } from '#models/finding.model';
import { FindingService } from '#services/finding.service';
import { makeBuilding, makeEquipment, makeFinding, makeReport } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { settle } from '#testing/settle';

import { FindingsService } from './findings.service';

const BUILDINGS = [
  makeBuilding({ id: 'bld-warsaw', name: 'Varsovie' }),
  makeBuilding({ id: 'bld-madrid', name: 'Madrid' }),
  makeBuilding({ id: 'bld-amsterdam', name: 'Amsterdam' }),
];
const EQUIPMENTS = [makeEquipment({ id: 'eq-temp', name: 'Sonde nord' })];

const WARSAW_SETPOINT = makeFinding({ kind: 'heating-setpoint', buildingId: 'bld-warsaw' });
const WARSAW_WEEKEND = makeFinding({ kind: 'weekend-hvac', buildingId: 'bld-warsaw' });
const MADRID_NIGHT = makeFinding({ kind: 'night-baseload', buildingId: 'bld-madrid' });
const AMSTERDAM_FROZEN = makeFinding({
  kind: 'frozen-sensor',
  buildingId: 'bld-amsterdam',
  id: 'frozen-sensor:bld-amsterdam:eq-temp',
  evidence: [{ equipmentId: 'eq-temp', metric: 'indoor-temperature' }],
  excessEnergyKwh: null,
});
const GHOST_MISSING = makeFinding({
  kind: 'missing-data',
  buildingId: 'bld-ghost',
  id: 'missing-data:bld-ghost:eq-unknown',
  evidence: [{ equipmentId: 'eq-unknown', metric: 'active-energy' }],
  excessEnergyKwh: null,
});
const NO_EVIDENCE = makeFinding({ kind: 'low-occupancy', buildingId: 'bld-madrid', evidence: [] });

interface Setup {
  readonly findings?: Finding[];
  readonly buildingId?: string;
  readonly reports?: Observable<AnalystReport[]>;
  readonly findingsLoading?: boolean;
  readonly findingProblem?: DataProblem | null;
}

function setup(options: Setup = {}): FindingsService {
  TestBed.configureTestingModule({
    providers: [
      FindingsService,
      provideServiceMock(FindingService, {
        findings: signal(options.findings ?? [MADRID_NIGHT, WARSAW_WEEKEND, WARSAW_SETPOINT, AMSTERDAM_FROZEN]),
        buildings: signal(BUILDINGS),
        equipments: signal(EQUIPMENTS),
        isLoading: signal(options.findingsLoading ?? false),
        problem: signal(options.findingProblem ?? null),
      }),
      provideServiceMock(ReportDao, { getAll: () => options.reports ?? of([...ANALYST_REPORTS]) }),
    ],
  });
  const service = TestBed.inject(FindingsService);
  service.connect(signal(options.buildingId));
  return service;
}

describe('FindingsService', () => {
  it('should list the waste by building name, then by rule order', async () => {
    const service = setup();

    await settle();

    expect(service.wasteRows().map((row) => row.id)).toEqual([
      'night-baseload:bld-madrid',
      'weekend-hvac:bld-warsaw',
      'heating-setpoint:bld-warsaw',
    ]);
    expect(service.wasteRows().map((row) => row.buildingName)).toEqual(['Madrid', 'Varsovie', 'Varsovie']);
  });

  it('should split data-quality findings from the waste and name the faulty equipment', async () => {
    const service = setup();

    await settle();

    expect(service.dataQualityRows().map((row) => [row.id, row.buildingName, row.equipmentName])).toEqual([
      ['frozen-sensor:bld-amsterdam:eq-temp', 'Amsterdam', 'Sonde nord'],
    ]);
    expect(service.wasteRows().some((row) => row.category === 'data-quality')).toBe(false);
  });

  it('should show an unknown id as is for the building and the equipment', async () => {
    const service = setup({ findings: [GHOST_MISSING] });

    await settle();

    const [row] = service.dataQualityRows();
    expect(row?.buildingName).toBe('bld-ghost');
    expect(row?.equipmentName).toBe('eq-unknown');
  });

  it('should give each row the link to its main evidence on the 8-week period', async () => {
    const service = setup({ findings: [WARSAW_WEEKEND, NO_EVIDENCE] });

    await settle();

    expect(service.wasteRows().find((row) => row.kind === 'weekend-hvac')?.evidenceLink).toEqual({
      commands: ['/equipments', 'eq-1'],
      queryParams: { metric: 'hvac-status', period: '8-weeks' },
    });
    expect(service.wasteRows().find((row) => row.kind === 'low-occupancy')?.evidenceLink).toBeNull();
  });

  it('should not filter without building parameter', async () => {
    const service = setup();

    await settle();

    expect(service.buildingFilter()).toBeNull();
  });

  it('should restrict both lists to the building of the query parameter', async () => {
    const service = setup({ buildingId: 'bld-warsaw' });

    await settle();

    expect(service.buildingFilter()).toEqual({ id: 'bld-warsaw', name: 'Varsovie' });
    expect(service.wasteRows().map((row) => row.buildingId)).toEqual(['bld-warsaw', 'bld-warsaw']);
    expect(service.dataQualityRows()).toEqual([]);
  });

  it('should follow the query parameter when it changes', async () => {
    const buildingId = signal<string | undefined>(undefined);
    const service = setup();
    service.connect(buildingId);
    await settle();

    buildingId.set('bld-madrid');

    expect(service.wasteRows().map((row) => row.id)).toEqual(['night-baseload:bld-madrid']);

    buildingId.set(undefined);

    expect(service.wasteRows()).toHaveLength(3);
  });

  it('should show an unknown building id as is and list nothing', async () => {
    const service = setup({ buildingId: 'bld-ghost' });

    await settle();

    expect(service.buildingFilter()).toEqual({ id: 'bld-ghost', name: 'bld-ghost' });
    expect(service.wasteRows()).toEqual([]);
  });

  it('should mark waste flagged by the analyst report, not the others', async () => {
    const service = setup();

    await settle();

    expect(service.wasteRows().map((row) => [row.buildingId, row.isFlaggedByAnalyst])).toEqual([
      ['bld-madrid', false],
      ['bld-warsaw', true],
      ['bld-warsaw', true],
    ]);
  });

  it('should flag Lyon, Warsaw, Berlin and Munich as reported and ignore recommendations without building', async () => {
    const service = setup({
      findings: ['bld-lyon', 'bld-warsaw', 'bld-berlin', 'bld-munich', 'bld-madrid'].map((buildingId) =>
        makeFinding({ buildingId, id: `weekend-hvac:${buildingId}` }),
      ),
    });

    await settle();

    expect(
      service
        .wasteRows()
        .map((row) => [row.buildingId, row.isFlaggedByAnalyst])
        .sort(),
    ).toEqual([
      ['bld-berlin', true],
      ['bld-lyon', true],
      ['bld-madrid', false],
      ['bld-munich', true],
      ['bld-warsaw', true],
    ]);
  });

  it('should flag nothing when no report is published', async () => {
    const service = setup({ reports: of([makeReport()]) });

    await settle();

    expect(service.wasteRows().every((row) => !row.isFlaggedByAnalyst)).toBe(true);
  });

  it('should be loading while the findings or the reports are pending', async () => {
    expect(setup({ findingsLoading: true }).isLoading()).toBe(true);
    TestBed.resetTestingModule();

    const service = setup({ reports: NEVER });
    await settle();

    expect(service.isLoading()).toBe(true);
  });

  it('should not be loading once loaded', async () => {
    const service = setup();

    await settle();

    expect(service.isLoading()).toBe(false);
    expect(service.problem()).toBeNull();
  });

  it('should relay the problem of the findings first', async () => {
    const problem: DataProblem = { type: 'not-found', title: 'Equipment not found' };
    const service = setup({ findingProblem: problem, reports: throwError(() => new Error('down')) });

    await settle();

    expect(service.problem()).toBe(problem);
  });

  it('should expose a problem when the reports fail', async () => {
    const service = setup({ reports: throwError(() => new Error('reports down')) });

    await settle();

    expect(service.problem()).toEqual({ type: 'unknown-error', title: 'Unknown error', detail: 'reports down' });
    expect(service.wasteRows().every((row) => !row.isFlaggedByAnalyst)).toBe(true);
  });
});
