import {
  getMeasurementPeriodRange,
  isMeasurementPeriod,
  MEASUREMENT_REFERENCE_INSTANT,
} from './measurement-period.model';

describe('getMeasurementPeriodRange', () => {
  it.each([
    ['7-days', '2026-10-26T00:00:00.000Z'],
    ['4-weeks', '2026-10-05T00:00:00.000Z'],
    ['8-weeks', '2026-09-07T00:00:00.000Z'],
  ] as const)(
    'should end at the reference instant and start at the right day for %s',
    (period, from) => {
      expect(getMeasurementPeriodRange(period)).toEqual({
        from,
        to: MEASUREMENT_REFERENCE_INSTANT,
      });
    },
  );

  it('should anchor on a constant, not on the current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));

    const range = getMeasurementPeriodRange('7-days');
    vi.useRealTimers();

    expect(range.to).toBe('2026-11-02T00:00:00.000Z');
  });
});

describe('isMeasurementPeriod', () => {
  it('should accept a known period', () => {
    expect(isMeasurementPeriod('4-weeks')).toBe(true);
  });

  it.each(['', '7days', '1-year'])('should reject "%s"', (value: string) => {
    expect(isMeasurementPeriod(value)).toBe(false);
  });
});
