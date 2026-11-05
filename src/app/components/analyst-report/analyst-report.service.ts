import { computed, Injectable, inject, type Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { BuildingDao } from '#dao/building.dao';
import { ReportDao } from '#dao/report.dao';
import { type AnalystRecommendation, type AnalystReport } from '#models/analyst-report.model';
import { type Building } from '#models/building.model';
import { type DataProblem } from '#models/data-problem.model';
import { toDataProblem } from '#utils/data-problem.utils';

@Injectable({ providedIn: 'root' })
export class AnalystReportService {
  // --- Injections ---
  private readonly _reportDao = inject(ReportDao);
  private readonly _buildingDao = inject(BuildingDao);

  // --- Internal signals ---
  private readonly _reportsResource = rxResource({
    stream: () => this._reportDao.getAll(),
    defaultValue: [],
  });
  private readonly _buildingsResource = rxResource({
    stream: () => this._buildingDao.getAll(),
    defaultValue: [],
  });

  private readonly _buildingNames = computed(
    () =>
      new Map(
        (this._buildingsResource.hasValue() ? this._buildingsResource.value() : []).map(
          (building: Building) => [building.id, building.name] as const,
        ),
      ),
  );

  /**
   * Reports with each recommendation's building name: `null` for a portfolio-wide recommendation.
   * Building names are a secondary lookup: when they are unavailable the building id is shown.
   */
  public readonly reports = computed(() => {
    const reports = this._reportsResource.hasValue() ? this._reportsResource.value() : [];
    const buildingNames: ReadonlyMap<string, string> = this._buildingNames();
    return reports.map((report: AnalystReport) => ({
      ...report,
      recommendations: report.recommendations.map((recommendation: AnalystRecommendation) => ({
        ...recommendation,
        buildingName:
          recommendation.buildingId === null
            ? null
            : (buildingNames.get(recommendation.buildingId) ?? recommendation.buildingId),
      })),
    }));
  });
  public readonly isLoading: Signal<boolean> = this._reportsResource.isLoading;
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._reportsResource.error();
    return error === undefined ? null : toDataProblem(error);
  });
}
