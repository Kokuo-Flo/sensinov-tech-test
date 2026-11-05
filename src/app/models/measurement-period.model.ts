/**
 * End of the mocked data window (exclusive). Every relative period is anchored here, never on
 * `Date.now()`, so the screens show the same data whatever the current date.
 */
export const MEASUREMENT_REFERENCE_INSTANT = '2026-11-02T00:00:00.000Z';

export const MEASUREMENT_PERIODS = ['7-days', '4-weeks', '8-weeks'] as const;
export type MeasurementPeriod = (typeof MEASUREMENT_PERIODS)[number];

export const DEFAULT_MEASUREMENT_PERIOD: MeasurementPeriod = '7-days';

/** ISO-8601 instants, `from` inclusive, `to` exclusive. */
export interface MeasurementRange {
  readonly from: string;
  readonly to: string;
}

const MS_PER_DAY = 86_400_000;

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
