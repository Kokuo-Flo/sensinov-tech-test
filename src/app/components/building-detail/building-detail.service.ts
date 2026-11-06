import { computed, Injectable, inject, type Signal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { BuildingDao } from '#dao/building.dao';
import { type DataProblem } from '#models/data-problem.model';
import { FindingService } from '#services/finding.service';
import { toDataProblem } from '#utils/data-problem.utils';

/**
 * Provided by `BuildingDetailComponent`: its state lives and dies with the page. The page hands
 * over its `buildingId` route input once through `connect()`; every request derives from it.
 */
@Injectable()
export class BuildingDetailService {
  // --- Injections ---
  private readonly _buildingDao = inject(BuildingDao);
  private readonly _findingService = inject(FindingService);

  // --- Internal signals ---
  private readonly _buildingIdSource = signal<Signal<string> | null>(null);
  private readonly _buildingId = computed(() => this._buildingIdSource()?.() ?? null);

  private readonly _buildingResource = rxResource({
    params: () => this._buildingId() ?? undefined,
    stream: ({ params: buildingId }: { params: string }) => this._buildingDao.getById(buildingId),
  });
  private readonly _equipmentsResource = rxResource({
    params: () => this._buildingId() ?? undefined,
    stream: ({ params: buildingId }: { params: string }) =>
      this._buildingDao.getEquipments(buildingId),
    defaultValue: [],
  });

  public readonly building = computed(() =>
    this._buildingResource.hasValue() ? this._buildingResource.value() : null,
  );
  public readonly equipments = computed(() =>
    this._equipmentsResource.hasValue() ? this._equipmentsResource.value() : [],
  );
  public readonly isLoading = computed(
    () => this._buildingResource.isLoading() || this._equipmentsResource.isLoading(),
  );
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._buildingResource.error() ?? this._equipmentsResource.error();
    return error === undefined ? null : toDataProblem(error);
  });

  /** Findings detected on the building; `null` while the detection runs or when it failed. */
  public readonly findingCount = computed<number | null>(() => {
    const buildingId = this._buildingId();
    if (
      buildingId === null ||
      this._findingService.isLoading() ||
      this._findingService.problem() !== null
    ) {
      return null;
    }
    return this._findingService.findingCountByBuilding().get(buildingId) ?? 0;
  });

  public connect(buildingId: Signal<string>): void {
    this._buildingIdSource.set(buildingId);
  }
}
