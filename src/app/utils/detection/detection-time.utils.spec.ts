import { getLocalTime, toHours } from './detection-time.utils';

describe('getLocalTime', () => {
  it('should shift a late UTC evening to the next local day and hour 0', () => {
    expect(getLocalTime('2026-09-06T23:00:00.000Z')).toEqual({
      localDay: '2026-09-07',
      localHour: 0,
      isWeekend: false,
    });
  });

  it('should keep fractional hours for 15-minute readings', () => {
    expect(getLocalTime('2026-09-07T06:45:00.000Z').localHour).toBe(7.75);
  });

  it('should flag Saturday and Sunday as weekend and Friday as working day', () => {
    expect(getLocalTime('2026-09-11T10:00:00.000Z').isWeekend).toBe(false);
    expect(getLocalTime('2026-09-12T10:00:00.000Z').isWeekend).toBe(true);
    expect(getLocalTime('2026-09-13T10:00:00.000Z').isWeekend).toBe(true);
  });

  it('should treat Sunday 23:00 UTC as Monday local (no longer weekend)', () => {
    expect(getLocalTime('2026-09-13T23:00:00.000Z')).toEqual({
      localDay: '2026-09-14',
      localHour: 0,
      isWeekend: false,
    });
  });
});

describe('getLocalTime memoization', () => {
  it('should return the same frozen reference on a second call', () => {
    const first = getLocalTime('2026-09-08T10:15:00.000Z');
    const second = getLocalTime('2026-09-08T10:15:00.000Z');

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('should stay correct after the cache was flushed by more than 10 000 distinct timestamps', () => {
    const base = Date.parse('2027-01-03T00:00:00.000Z');
    const before = getLocalTime('2026-09-13T23:00:00.000Z');

    for (let index = 0; index < 10_050; index += 1) {
      getLocalTime(new Date(base + index * 60_000).toISOString());
    }
    const after = getLocalTime('2026-09-13T23:00:00.000Z');

    expect(after).toEqual({ localDay: '2026-09-14', localHour: 0, isWeekend: false });
    expect(after).toEqual(before);
    expect(getLocalTime('2027-01-03T00:30:00.000Z')).toEqual({ localDay: '2027-01-03', localHour: 1.5, isWeekend: true });
  });
});

describe('toHours', () => {
  it('should convert a point count to hours', () => {
    expect(toHours(8, 15)).toBe(2);
    expect(toHours(3, 60)).toBe(3);
  });

  it('should return 0 for no point', () => {
    expect(toHours(0, 15)).toBe(0);
  });
});
