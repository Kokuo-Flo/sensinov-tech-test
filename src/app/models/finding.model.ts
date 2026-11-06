/**
 * Finding: an anomaly the detection rules found in the measurements — either energy waste or a data-quality
 * defect. Produced by `src/app/utils/detection/`, listed on the findings page, valued on the priorities page.
 */

import { type MetricKey } from './equipment.model';
import { type MeasurementPeriod } from './measurement-period.model';

/**
 * Anomalies a rule can find, one rule each.
 * Waste: `'weekend-hvac'` (HVAC running on weekends in an empty building), `'heating-setpoint'` (setpoint
 * above the 21 °C reference), `'night-baseload'` (lighting & plugs left on at night), `'early-hvac-start'`
 * (HVAC started long before occupants arrive), `'low-occupancy'` (under-used building conditioned as if full).
 * Data quality: `'frozen-sensor'` (series stuck on a constant value), `'missing-data'` (series without readings).
 */
export const FINDING_KINDS = [
  'weekend-hvac',
  'heating-setpoint',
  'night-baseload',
  'early-hvac-start',
  'low-occupancy',
  'frozen-sensor',
  'missing-data',
] as const;

/**
 * `'waste'` = energy wasted, valued in kWh / € / kgCO₂e; `'data-quality'` = figures of the building
 * to confirm.
 */
export const FINDING_CATEGORIES = ['waste', 'data-quality'] as const;

/** Rules read the whole data window; « Voir les mesures » opens the evidence on the same period. */
export const FINDING_PERIOD: MeasurementPeriod = '8-weeks';

export type FindingKind = (typeof FINDING_KINDS)[number];

export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

/** Anomaly detected in the measurements of one building by one deterministic rule. */
export interface Finding {
  /** `${kind}:${buildingId}`, plus `:${equipmentId}` for a data-quality finding (see {@link getFindingId}). */
  readonly id: string;
  readonly kind: FindingKind;
  /** Always `getFindingCategory(kind)`. */
  readonly category: FindingCategory;
  readonly buildingId: string;

  /**
   * ISO-8601 UTC. Per-day waste rules: start of the first sample of the first flagged local day.
   * Data-quality rules: start of the earliest faulty sample of the equipment.
   */
  readonly firstSeenAt: string;
  /**
   * ISO-8601 UTC. Per-day waste rules: start of the last sample of the last flagged local day.
   * Data-quality rules: start of the latest faulty sample of the equipment.
   */
  readonly lastSeenAt: string;
  /** Number of distinct local days concerned (flagged days, or days touched by a faulty sample). */
  readonly occurrences: number;

  /**
   * Figure measured in the building, compared with `reference`, both in `unit`. Per kind (observed vs reference):
   * - `weekend-hvac`: weekend days with HVAC running in an empty building vs weekend days analyzed (`'days'`);
   * - `heating-setpoint`: median setpoint vs 21 °C reference (`'°C'`);
   * - `night-baseload`: median night / day power ratio vs healthy ratio (`'ratio'`);
   * - `early-hvac-start`: median HVAC start vs median occupant arrival, local hours of day (`'h'`);
   * - `low-occupancy`: median working-day occupancy peak vs detection threshold, share of capacity (`'ratio'`);
   * - `frozen-sensor`, `missing-data`: longest faulty run vs detection threshold, hours (`'h'`).
   */
  readonly observed: number;
  /** Value `observed` is compared with; see `observed`. */
  readonly reference: number;
  /** `'°C'`, `'ratio'` (0–1), `'h'` (duration in hours, or local hour of day), `'days'` (count of days). */
  readonly unit: string;

  /** Series proving the finding, most telling first. */
  readonly evidence: readonly FindingEvidence[];
  /**
   * Energy wasted over the analysis window, kWh, estimated by the rule (formula documented on each rule).
   * `null` for a data-quality finding, or when the sub-meter needed for the estimate is absent.
   */
  readonly excessEnergyKwh: number | null;
}

/** Series that proves a finding: open it on the equipment page to see the anomaly. */
export interface FindingEvidence {
  readonly equipmentId: string;
  readonly metric: MetricKey;
}

/** Router link opening the evidence series on the equipment page (`/equipments/:id?metric=…&period=…`). */
export interface FindingEvidenceLink {
  /** `routerLink` commands: `['/equipments', equipmentId]`. */
  readonly commands: readonly string[];
  readonly queryParams: { readonly metric: MetricKey; readonly period: MeasurementPeriod };
}

/** Category of a kind: frozen sensor and missing data are data quality, every other kind is waste. */
export function getFindingCategory(kind: FindingKind): FindingCategory {
  return kind === 'frozen-sensor' || kind === 'missing-data' ? 'data-quality' : 'waste';
}

export function isWasteFinding(finding: Finding): boolean {
  return finding.category === 'waste';
}

export function isDataQualityFinding(finding: Finding): boolean {
  return finding.category === 'data-quality';
}

/** Finding id: `${kind}:${buildingId}`, plus `:${equipmentId}` for a data-quality finding. */
export function getFindingId(kind: FindingKind, buildingId: string, equipmentId?: string): string {
  return equipmentId === undefined ? `${kind}:${buildingId}` : `${kind}:${buildingId}:${equipmentId}`;
}

/** Link to the equipment page showing the main evidence of `finding`; `null` without evidence. */
export function getEvidenceLink(finding: Finding): FindingEvidenceLink | null {
  const evidence = finding.evidence[0];
  if (evidence === undefined) {
    return null;
  }
  return {
    commands: ['/equipments', evidence.equipmentId],
    queryParams: { metric: evidence.metric, period: FINDING_PERIOD },
  };
}
