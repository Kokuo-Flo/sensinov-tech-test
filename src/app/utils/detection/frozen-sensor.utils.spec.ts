import { dayPoints, daysPoints, localDayOf, makeDetectionInput, makeDetectionSeries } from '#testing/detection';

import { detectFrozenSensors, findFrozenRuns } from './frozen-sensor.utils';

const MONDAY = localDayOf(0);

describe('findFrozenRuns', () => {
  it('should find a 24 h run of identical readings (96 points at 15 min)', () => {
    const series = makeDetectionSeries('indoor-temperature', dayPoints(MONDAY, () => 21, 15), {
      intervalMinutes: 15,
    });

    expect(findFrozenRuns(series).map((run) => run.length)).toEqual([96]);
  });

  it('should ignore a 23 h 45 run', () => {
    const series = makeDetectionSeries('indoor-temperature', dayPoints(MONDAY, () => 21, 15, 0, 23.75), {
      intervalMinutes: 15,
    });

    expect(findFrozenRuns(series)).toEqual([]);
  });

  it.each(['hvac-status', 'heating-setpoint', 'occupancy-count'] as const)(
    'should never flag %s, constant by nature',
    (metric) => {
      const series = makeDetectionSeries(metric, daysPoints([0, 1, 2], () => 0));

      expect(findFrozenRuns(series)).toEqual([]);
    },
  );

  it('should flag a frozen energy reading', () => {
    const series = makeDetectionSeries('active-energy', daysPoints([0, 1], () => 3), {
      meterScope: 'main',
    });

    expect(findFrozenRuns(series).map((run) => run.length)).toEqual([48]);
  });

  it('should not treat null readings as a frozen run', () => {
    const series = makeDetectionSeries('indoor-temperature', daysPoints([0, 1, 2], () => null));

    expect(findFrozenRuns(series)).toEqual([]);
  });

  it('should split runs where the value changes', () => {
    const series = makeDetectionSeries(
      'indoor-temperature',
      daysPoints([0, 1, 2, 3], (_hour, offset) => (offset === 2 ? 22 : 21)),
    );

    expect(findFrozenRuns(series).map((run) => run.length)).toEqual([48, 24, 24]);
  });
});

describe('detectFrozenSensors', () => {
  it('should report the longest frozen run per equipment, in hours', () => {
    const series = makeDetectionSeries(
      'indoor-temperature',
      daysPoints([0, 1, 2, 3, 4], (_hour, offset) => (offset === 2 ? 20 : 21)),
      { equipmentId: 'eq-temp' },
    );

    const findings = detectFrozenSensors(makeDetectionInput([series]));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'frozen-sensor:bld-test:eq-temp',
      kind: 'frozen-sensor',
      category: 'data-quality',
      buildingId: 'bld-test',
      observed: 48,
      reference: 24,
      unit: 'h',
      occurrences: 5,
      excessEnergyKwh: null,
      evidence: [{ equipmentId: 'eq-temp', metric: 'indoor-temperature' }],
    });
  });

  it('should return no finding for healthy series', () => {
    const series = makeDetectionSeries('indoor-temperature', daysPoints([0, 1], (hour) => 20 + hour / 10));

    expect(detectFrozenSensors(makeDetectionInput([series]))).toEqual([]);
  });
});
