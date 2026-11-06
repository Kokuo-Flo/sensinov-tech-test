import { makeEquipment, makePoint, makeSeries } from '#testing/fixtures';
import { dayPoints, localDayOf, localPoint, makeDetectionInput, makeDetectionSeries } from '#testing/detection';

import {
  countLocalDays,
  findSeries,
  getDaysSpan,
  groupByLocalDay,
  hasDayCoverage,
  indexByLocalDay,
  isRunningPoint,
  mean,
  median,
  readValues,
  splitRuns,
  sumDaysEnergyKwh,
  sumValues,
  toDetectionSeries,
} from './detection-series.utils';

const MONDAY = localDayOf(0);
const TUESDAY = localDayOf(1);

describe('toDetectionSeries', () => {
  const equipment = makeEquipment({ id: 'eq-x' });

  it('should convert Wh energy to kWh, keep null and place points in local time', () => {
    const series = makeSeries({
      unit: 'Wh',
      metric: 'active-energy',
      points: [makePoint('2026-09-06T23:00:00.000Z', 1500), makePoint('2026-09-07T00:00:00.000Z', null)],
    });

    const result = toDetectionSeries(equipment, series);

    expect(result.points).toEqual([
      { timestamp: '2026-09-06T23:00:00.000Z', value: 1.5, localDay: '2026-09-07', localHour: 0, isWeekend: false },
      { timestamp: '2026-09-07T00:00:00.000Z', value: null, localDay: '2026-09-07', localHour: 1, isWeekend: false },
    ]);
    expect(result.equipment).toBe(equipment);
    expect(result.metric).toBe('active-energy');
  });

  it('should not convert non-energy values even with a Wh unit', () => {
    const series = makeSeries({
      unit: 'Wh',
      metric: 'occupancy-count',
      points: [makePoint('2026-09-07T10:00:00.000Z', 1500)],
    });

    expect(toDetectionSeries(equipment, series).points.map((p) => p.value)).toEqual([1500]);
  });
});

describe('findSeries', () => {
  const hvacMeter = makeDetectionSeries('active-energy', [], { meterScope: 'hvac' });
  const mainMeter = makeDetectionSeries('active-energy', [], { meterScope: 'main' });
  const input = makeDetectionInput([mainMeter, hvacMeter]);

  it('should return the first series of the metric without scope', () => {
    expect(findSeries(input, 'active-energy')).toBe(mainMeter);
  });

  it('should restrict energy to the requested meter scope', () => {
    expect(findSeries(input, 'active-energy', 'hvac')).toBe(hvacMeter);
  });

  it('should return null when no series matches', () => {
    expect(findSeries(input, 'occupancy-count')).toBeNull();
    expect(findSeries(input, 'active-energy', 'lighting-plugs')).toBeNull();
  });
});

describe('local day grouping', () => {
  const points = [
    localPoint(MONDAY, 1, 1),
    localPoint(MONDAY, 2, 2),
    localPoint(TUESDAY, 1, 3),
  ];

  it('should group chronologically by local day', () => {
    const days = groupByLocalDay(points);

    expect(days.map((day) => [day.localDay, day.points.length, day.isWeekend])).toEqual([
      [MONDAY, 2, false],
      [TUESDAY, 1, false],
    ]);
  });

  it('should flag a weekend day', () => {
    expect(groupByLocalDay([localPoint(localDayOf(5), 3, 1)])[0]?.isWeekend).toBe(true);
  });

  it('should return no day for no point', () => {
    expect(groupByLocalDay([])).toEqual([]);
  });

  it('should index days by local day', () => {
    expect(indexByLocalDay(points).get(TUESDAY)?.points.length).toBe(1);
    expect(indexByLocalDay(points).get('2000-01-01')).toBeUndefined();
  });

  it('should count distinct local days', () => {
    expect(countLocalDays(points)).toBe(2);
    expect(countLocalDays([])).toBe(0);
  });
});

describe('value helpers', () => {
  const points = [localPoint(MONDAY, 1, 4), localPoint(MONDAY, 2, null), localPoint(MONDAY, 3, 2)];

  it('should read non-null values in order', () => {
    expect(readValues(points)).toEqual([4, 2]);
  });

  it('should sum non-null values and return 0 when none', () => {
    expect(sumValues(points)).toBe(6);
    expect(sumValues([localPoint(MONDAY, 1, null)])).toBe(0);
  });

  it('should compute the median of an odd, even and empty list', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('should not mutate the list given to median', () => {
    const values = [3, 1, 2];

    median(values);

    expect(values).toEqual([3, 1, 2]);
  });

  it('should compute the mean and null when empty', () => {
    expect(mean([1, 2, 6])).toBe(3);
    expect(mean([])).toBeNull();
  });

  it('should sum the energy of the requested days, counting a missing day as 0', () => {
    const energy = makeDetectionSeries('active-energy', [
      localPoint(MONDAY, 1, 2),
      localPoint(MONDAY, 2, 3),
      localPoint(TUESDAY, 1, 10),
    ]);

    expect(sumDaysEnergyKwh(energy, [MONDAY, '2000-01-01'])).toBe(5);
    expect(sumDaysEnergyKwh(energy, [])).toBe(0);
  });
});

describe('getDaysSpan', () => {
  it('should span from the first point of the first day to the last point of the last day', () => {
    const days = groupByLocalDay([
      localPoint(MONDAY, 1, 1),
      localPoint(MONDAY, 2, 1),
      localPoint(TUESDAY, 5, 1),
      localPoint(TUESDAY, 6, 1),
    ]);

    expect(getDaysSpan(days)).toEqual({
      firstSeenAt: localPoint(MONDAY, 1, 1).timestamp,
      lastSeenAt: localPoint(TUESDAY, 6, 1).timestamp,
    });
  });

  it('should return null without day', () => {
    expect(getDaysSpan([])).toBeNull();
  });
});

describe('hasDayCoverage', () => {
  const [day19h] = groupByLocalDay(dayPoints(MONDAY, () => 1, 60, 0, 19));
  const [day20h] = groupByLocalDay(dayPoints(MONDAY, () => 1, 60, 0, 20));

  it('should refuse a day with 19 h of readings and accept 20 h', () => {
    expect(day19h && hasDayCoverage(day19h, 60)).toBe(false);
    expect(day20h && hasDayCoverage(day20h, 60)).toBe(true);
  });

  it('should not count null readings as coverage', () => {
    const [day] = groupByLocalDay(dayPoints(MONDAY, (hour) => (hour < 5 ? null : 1), 60, 0, 24));

    expect(day && hasDayCoverage(day, 60)).toBe(false);
  });

  it('should scale with the sampling interval', () => {
    const [day] = groupByLocalDay(dayPoints(MONDAY, () => 1, 15, 0, 20));

    expect(day && hasDayCoverage(day, 15)).toBe(true);
  });
});

describe('isRunningPoint', () => {
  it('should be running from 0.5 and not for 0.49 or null', () => {
    expect(isRunningPoint(localPoint(MONDAY, 1, 1))).toBe(true);
    expect(isRunningPoint(localPoint(MONDAY, 1, 0.5))).toBe(true);
    expect(isRunningPoint(localPoint(MONDAY, 1, 0.49))).toBe(false);
    expect(isRunningPoint(localPoint(MONDAY, 1, null))).toBe(false);
  });
});

describe('splitRuns', () => {
  const sameValue = (a: { value: number | null }, b: { value: number | null }): boolean => a.value === b.value;

  it('should cut a new run whenever the predicate fails', () => {
    const points = [1, 1, 2, 2, 2, 1].map((value, index) => localPoint(MONDAY, index, value));

    const runs = splitRuns(points, sameValue);

    expect(runs.map((run) => run.map((point) => point.value))).toEqual([[1, 1], [2, 2, 2], [1]]);
  });

  it('should return no run for no point', () => {
    expect(splitRuns([], sameValue)).toEqual([]);
  });
});
