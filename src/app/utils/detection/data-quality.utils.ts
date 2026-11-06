import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type SeriesDefectRuns,
} from '#models/detection.model';
import {
  type Finding,
  type FindingKind,
  getFindingCategory,
  getFindingId,
} from '#models/finding.model';

import { countLocalDays } from './detection-series.utils';
import { toHours } from './detection-time.utils';

/**
 * One data-quality finding per equipment with at least one faulty run. `observed` = longest run in hours,
 * `reference` = `thresholdHours`, `unit` = `'h'`; evidence = every faulty series of the equipment.
 */
export function toDataQualityFindings(
  kind: FindingKind,
  input: BuildingDetectionInput,
  defects: readonly SeriesDefectRuns[],
  thresholdHours: number,
): Finding[] {
  const byEquipment = new Map<string, SeriesDefectRuns[]>();
  defects
    .filter((defect: SeriesDefectRuns) => defect.runs.length > 0)
    .forEach((defect: SeriesDefectRuns) => {
      const equipmentId = defect.series.equipment.id;
      byEquipment.set(equipmentId, [...(byEquipment.get(equipmentId) ?? []), defect]);
    });
  return [...byEquipment.entries()].flatMap(
    ([equipmentId, equipmentDefects]: [string, SeriesDefectRuns[]]) => {
      const points = equipmentDefects.flatMap((defect: SeriesDefectRuns) => defect.runs.flat());
      const timestamps = points.map((point: DetectionPoint) => point.timestamp).sort();
      const firstSeenAt = timestamps[0];
      const lastSeenAt = timestamps[timestamps.length - 1];
      if (firstSeenAt === undefined || lastSeenAt === undefined) {
        return [];
      }
      return [
        {
          id: getFindingId(kind, input.building.id, equipmentId),
          kind,
          category: getFindingCategory(kind),
          buildingId: input.building.id,
          firstSeenAt,
          lastSeenAt,
          occurrences: countLocalDays(points),
          observed: Math.max(
            ...equipmentDefects.flatMap((defect: SeriesDefectRuns) =>
              defect.runs.map((run: readonly DetectionPoint[]) =>
                toHours(run.length, defect.series.intervalMinutes),
              ),
            ),
          ),
          reference: thresholdHours,
          unit: 'h',
          evidence: equipmentDefects.map((defect: SeriesDefectRuns) => ({
            equipmentId,
            metric: defect.series.metric,
          })),
          excessEnergyKwh: null,
        },
      ];
    },
  );
}
