import { computed, Injectable, inject, type Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map, type Observable, of, switchMap } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { EquipmentDao } from '#dao/equipment.dao';
import { type Building } from '#models/building.model';
import { type DataProblem } from '#models/data-problem.model';
import {
  type BuildingDetectionInput,
  type DetectionResult,
  type DetectionSeries,
} from '#models/detection.model';
import { type Equipment, type MetricDefinition } from '#models/equipment.model';
import { FINDING_PERIOD, type Finding } from '#models/finding.model';
import { getMeasurementPeriodRange, type MeasurementRange } from '#models/measurement-period.model';
import { type MeasurementSeries } from '#models/measurement.model';
import { toDataProblem } from '#utils/data-problem.utils';
import { detectBuildingFindings } from '#utils/detection/detect-findings.utils';
import { toDetectionSeries } from '#utils/detection/detection-series.utils';

const EMPTY_RESULT: DetectionResult = { buildings: [], equipments: [], findings: [] };

/**
 * Detected anomalies of the whole portfolio. Loads every series of every building over the data window
 * once, runs the detection rules, and keeps only the result: being a root service, navigating between
 * pages never reloads nor recomputes it.
 */
@Injectable({ providedIn: 'root' })
export class FindingService {
  // --- Injections ---
  private readonly _buildingDao = inject(BuildingDao);
  private readonly _equipmentDao = inject(EquipmentDao);

  // --- Internal signals ---
  private readonly _resultResource = rxResource({
    stream: () => this._getDetectionResult(),
    defaultValue: EMPTY_RESULT,
  });
  private readonly _result = computed(() =>
    this._resultResource.hasValue() ? this._resultResource.value() : EMPTY_RESULT,
  );

  public readonly findings = computed(() => this._result().findings);
  public readonly buildings = computed(() => this._result().buildings);
  public readonly equipments = computed(() => this._result().equipments);
  /** Findings (waste and data quality) per building id; a building without finding is absent. */
  public readonly findingCountByBuilding = computed(() =>
    this.findings().reduce(
      (counts: Map<string, number>, finding: Finding) =>
        counts.set(finding.buildingId, (counts.get(finding.buildingId) ?? 0) + 1),
      new Map<string, number>(),
    ),
  );
  public readonly isLoading: Signal<boolean> = this._resultResource.isLoading;
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._resultResource.error();
    return error === undefined ? null : toDataProblem(error);
  });

  private _getDetectionResult(): Observable<DetectionResult> {
    const range = getMeasurementPeriodRange(FINDING_PERIOD);
    return this._buildingDao.getAll().pipe(
      switchMap((buildings: Building[]) =>
        joinAll(buildings.map((building: Building) => this._getBuildingInput(building, range))),
      ),
      map((inputs: BuildingDetectionInput[]) => ({
        buildings: inputs.map((input: BuildingDetectionInput) => input.building),
        equipments: inputs.flatMap((input: BuildingDetectionInput) => getEquipments(input)),
        findings: inputs.flatMap((input: BuildingDetectionInput) => detectBuildingFindings(input)),
      })),
    );
  }

  private _getBuildingInput(
    building: Building,
    range: MeasurementRange,
  ): Observable<BuildingDetectionInput> {
    return this._buildingDao.getEquipments(building.id).pipe(
      switchMap((equipments: Equipment[]) =>
        joinAll(
          equipments.flatMap((equipment: Equipment) =>
            equipment.metrics.map((definition: MetricDefinition) =>
              this._equipmentDao
                .getMeasurements(equipment.id, definition.key, range.from, range.to)
                .pipe(map((series: MeasurementSeries) => toDetectionSeries(equipment, series))),
            ),
          ),
        ),
      ),
      map((series: DetectionSeries[]) => ({ building, series })),
    );
  }
}

/** `forkJoin` that emits `[]` for no source instead of completing without value. */
function joinAll<T>(sources: readonly Observable<T>[]): Observable<T[]> {
  return sources.length === 0 ? of([]) : forkJoin([...sources]);
}

/** Distinct equipments of the analyzed series, in series order. */
function getEquipments(input: BuildingDetectionInput): Equipment[] {
  return [
    ...new Map(
      input.series.map((series: DetectionSeries) => [series.equipment.id, series.equipment] as const),
    ).values(),
  ];
}
