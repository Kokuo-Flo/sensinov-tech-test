import {
  type BuildingDetectionInput,
  type DetectionPoint,
  type DetectionSeries,
} from '#models/detection.model';
import { type Finding } from '#models/finding.model';

import { detectEarlyHvacStart } from './early-hvac-start.utils';
import { detectFrozenSensors, findFrozenRuns } from './frozen-sensor.utils';
import { detectHeatingSetpoint } from './heating-setpoint.utils';
import { detectLowOccupancy } from './low-occupancy.utils';
import { detectMissingData } from './missing-data.utils';
import { detectNightBaseload } from './night-baseload.utils';
import { detectWeekendHvac } from './weekend-hvac.utils';

type DetectionRule = (input: BuildingDetectionInput) => Finding[];

const WASTE_RULES: readonly DetectionRule[] = [
  detectWeekendHvac,
  detectHeatingSetpoint,
  detectNightBaseload,
  detectEarlyHvacStart,
  detectLowOccupancy,
];

/**
 * Every finding of one building: data-quality rules on the raw series first, then waste rules on the
 * series cleaned of the doubtful points — a frozen reading must not pass for a real one.
 */
export function detectBuildingFindings(input: BuildingDetectionInput): Finding[] {
  const dataQualityFindings = [...detectFrozenSensors(input), ...detectMissingData(input)];
  const cleanedInput = excludeDoubtfulPoints(input);
  return [
    ...WASTE_RULES.flatMap((rule: DetectionRule) => rule(cleanedInput)),
    ...dataQualityFindings,
  ];
}

/** Copy of `input` whose frozen readings are blanked (`null`); missing readings already are. */
export function excludeDoubtfulPoints(input: BuildingDetectionInput): BuildingDetectionInput {
  return {
    ...input,
    series: input.series.map((series: DetectionSeries) => {
      const frozenTimestamps = new Set(
        findFrozenRuns(series)
          .flat()
          .map((point: DetectionPoint) => point.timestamp),
      );
      if (frozenTimestamps.size === 0) {
        return series;
      }
      return {
        ...series,
        points: series.points.map((point: DetectionPoint) =>
          frozenTimestamps.has(point.timestamp) ? { ...point, value: null } : point,
        ),
      };
    }),
  };
}
