/**
 * Time windows the measurements can be viewed and analyzed over, all anchored on the end of the generated
 * data. Used by the equipment page period selector and by the detection and impact computations.
 */

/**
 * End of the generated data window, ISO-8601 UTC (exclusive). Every relative period is anchored here, never on
 * `Date.now()`, so the screens show the same data whatever the current date.
 */
export const MEASUREMENT_REFERENCE_INSTANT = '2026-11-02T00:00:00.000Z';

/** Selectable periods, ending at {@link MEASUREMENT_REFERENCE_INSTANT}: 7, 28 or 56 days. */
export const MEASUREMENT_PERIODS = ['7-days', '4-weeks', '8-weeks'] as const;

export const DEFAULT_MEASUREMENT_PERIOD: MeasurementPeriod = '7-days';

const MS_PER_DAY = 86_400_000;

export type MeasurementPeriod = (typeof MEASUREMENT_PERIODS)[number];

/** Time range, ISO-8601 UTC instants: `from` inclusive, `to` exclusive. */
export interface MeasurementRange {
  readonly from: string;
  readonly to: string;
}

export function isMeasurementPeriod(value: string): value is MeasurementPeriod {
  return MEASUREMENT_PERIODS.some((period: MeasurementPeriod) => period === value);
}

/** Range covering `period` and ending at {@link MEASUREMENT_REFERENCE_INSTANT}. */
export function getMeasurementPeriodRange(period: MeasurementPeriod): MeasurementRange {
  const toMs = Date.parse(MEASUREMENT_REFERENCE_INSTANT);
  const fromMs = toMs - getPeriodDurationDays(period) * MS_PER_DAY;
  return { from: new Date(fromMs).toISOString(), to: MEASUREMENT_REFERENCE_INSTANT };
}

function getPeriodDurationDays(period: MeasurementPeriod): number {
  switch (period) {
    case '7-days':
      return 7;
    case '4-weeks':
      return 28;
    case '8-weeks':
      return 56;
  }
}
