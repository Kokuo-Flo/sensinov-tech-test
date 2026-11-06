import { computed, Injectable, inject, type Signal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { ReportDao } from '#dao/report.dao';
import { type AnalystRecommendation, type AnalystReport } from '#models/analyst-report.model';
import { type Building } from '#models/building.model';
import { type DataProblem } from '#models/data-problem.model';
import { type Equipment } from '#models/equipment.model';
import {
  FINDING_KINDS,
  type Finding,
  type FindingEvidenceLink,
  getEvidenceLink,
  isDataQualityFinding,
  isWasteFinding,
} from '#models/finding.model';
import { FindingService } from '#services/finding.service';
import { toDataProblem } from '#utils/data-problem.utils';

const COLLATOR = new Intl.Collator('fr-FR', { sensitivity: 'base' });

type FindingRow = Finding & {
  readonly buildingName: string;
  readonly evidenceLink: FindingEvidenceLink | null;
};

/**
 * Provided by `FindingsComponent`: page state on top of the portfolio findings of `FindingService`
 * (building filter, display names, cross-check with the analyst report).
 * The page hands over its `building` query parameter once through `connect()`.
 */
@Injectable()
export class FindingsService {
  // --- Injections ---
  private readonly _findingService = inject(FindingService);
  private readonly _reportDao = inject(ReportDao);

  // --- Internal signals ---
  private readonly _buildingIdSource = signal<Signal<string | undefined> | null>(null);
  private readonly _buildingId = computed(() => this._buildingIdSource()?.() ?? null);

  private readonly _reportsResource = rxResource({
    stream: () => this._reportDao.getAll(),
    defaultValue: [],
  });

  /** Buildings named by at least one recommendation of the analyst report. */
  private readonly _analystBuildingIds = computed(
    () =>
      new Set(
        (this._reportsResource.hasValue() ? this._reportsResource.value() : []).flatMap(
          (report: AnalystReport) =>
            report.recommendations.flatMap((recommendation: AnalystRecommendation) =>
              recommendation.buildingId === null ? [] : [recommendation.buildingId],
            ),
        ),
      ),
  );
  private readonly _buildingNames = computed(
    () =>
      new Map(
        this._findingService
          .buildings()
          .map((building: Building) => [building.id, building.name] as const),
      ),
  );
  private readonly _equipmentNames = computed(
    () =>
      new Map(
        this._findingService
          .equipments()
          .map((equipment: Equipment) => [equipment.id, equipment.name] as const),
      ),
  );
  /** Findings of the filtered building (all when unfiltered), by building name then rule order. */
  private readonly _visibleFindings = computed<FindingRow[]>(() => {
    const buildingId = this._buildingId();
    const buildingNames: ReadonlyMap<string, string> = this._buildingNames();
    return this._findingService
      .findings()
      .filter((finding: Finding) => buildingId === null || finding.buildingId === buildingId)
      .map((finding: Finding) => ({
        ...finding,
        buildingName: buildingNames.get(finding.buildingId) ?? finding.buildingId,
        evidenceLink: getEvidenceLink(finding),
      }))
      .sort(
        (left: FindingRow, right: FindingRow) =>
          COLLATOR.compare(left.buildingName, right.buildingName) ||
          FINDING_KINDS.indexOf(left.kind) - FINDING_KINDS.indexOf(right.kind),
      );
  });

  /** Filtered building, its id shown when the name is unknown; `null` when the whole portfolio is listed. */
  public readonly buildingFilter = computed(() => {
    const buildingId = this._buildingId();
    if (buildingId === null) {
      return null;
    }
    return { id: buildingId, name: this._buildingNames().get(buildingId) ?? buildingId };
  });
  public readonly wasteRows = computed(() => {
    const analystBuildingIds: ReadonlySet<string> = this._analystBuildingIds();
    return this._visibleFindings()
      .filter(isWasteFinding)
      .map((finding: FindingRow) => ({
        ...finding,
        isFlaggedByAnalyst: analystBuildingIds.has(finding.buildingId),
      }));
  });
  public readonly dataQualityRows = computed(() => {
    const equipmentNames: ReadonlyMap<string, string> = this._equipmentNames();
    return this._visibleFindings()
      .filter(isDataQualityFinding)
      .map((finding: FindingRow) => {
        const equipmentId = finding.evidence[0]?.equipmentId ?? '';
        return { ...finding, equipmentName: equipmentNames.get(equipmentId) ?? equipmentId };
      });
  });
  public readonly isLoading = computed(
    () => this._findingService.isLoading() || this._reportsResource.isLoading(),
  );
  public readonly problem = computed<DataProblem | null>(() => {
    const findingProblem = this._findingService.problem();
    if (findingProblem !== null) {
      return findingProblem;
    }
    const reportError = this._reportsResource.error();
    return reportError === undefined ? null : toDataProblem(reportError);
  });

  public connect(buildingId: Signal<string | undefined>): void {
    this._buildingIdSource.set(buildingId);
  }
}
