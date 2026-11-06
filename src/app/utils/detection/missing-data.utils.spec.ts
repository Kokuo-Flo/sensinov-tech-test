import { daysPoints, localDayOf, makeDetectionInput, makeDetectionSeries, dayPoints } from '#testing/detection';

import { detectMissingData, findMissingRuns } from './missing-data.utils';

const MONDAY = localDayOf(0);

describe('findMissingRuns', () => {
  it('should find a 6 h gap', () => {
    const series = makeDetectionSeries(
      'active-energy',
      dayPoints(MONDAY, (hour) => (hour >= 2 && hour < 8 ? null : 1)),
    );

    expect(findMissingRuns(series).map((run) => run.length)).toEqual([6]);
  });

  it('should ignore a 5 h gap', () => {
    const series = makeDetectionSeries(
      'active-energy',
      dayPoints(MONDAY, (hour) => (hour >= 2 && hour < 7 ? null : 1)),
    );

    expect(findMissingRuns(series)).toEqual([]);
  });

  it('should measure the gap in time, not in points (15-min readings)', () => {
    const series = makeDetectionSeries(
      'active-energy',
      dayPoints(MONDAY, (hour) => (hour >= 2 && hour < 7.75 ? null : 1), 15),
      { intervalMinutes: 15 },
    );

    expect(findMissingRuns(series)).toEqual([]);
  });
});

describe('detectMissingData', () => {
  it('should report one finding per equipment with its longest gap', () => {
    const meter = makeDetectionSeries(
      'active-energy',
      daysPoints([0, 1, 2], (hour, offset) =>
        offset === 0 && hour < 7 ? null : offset === 2 && hour < 10 ? null : 1,
      ),
      { equipmentId: 'eq-meter', meterScope: 'main' },
    );
    const healthy = makeDetectionSeries('indoor-temperature', daysPoints([0, 1, 2], () => 20), {
      equipmentId: 'eq-ok',
    });

    const findings = detectMissingData(makeDetectionInput([meter, healthy]));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'missing-data:bld-test:eq-meter',
      kind: 'missing-data',
      category: 'data-quality',
      observed: 10,
      reference: 6,
      unit: 'h',
      occurrences: 2,
      excessEnergyKwh: null,
      evidence: [{ equipmentId: 'eq-meter', metric: 'active-energy' }],
    });
  });

  it('should merge two faulty series of the same equipment into one finding with both as evidence', () => {
    const gap = (hour: number): number | null => (hour < 8 ? null : 1);
    const energy = makeDetectionSeries('active-energy', dayPoints(MONDAY, gap), { equipmentId: 'eq-a' });
    const temperature = makeDetectionSeries('indoor-temperature', dayPoints(MONDAY, gap), {
      equipmentId: 'eq-a',
    });

    const findings = detectMissingData(makeDetectionInput([energy, temperature]));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence.map((e) => e.metric)).toEqual(['active-energy', 'indoor-temperature']);
    expect(findings[0]?.occurrences).toBe(1);
  });

  it('should return nothing when every series is complete', () => {
    const series = makeDetectionSeries('active-energy', dayPoints(MONDAY, () => 1));

    expect(detectMissingData(makeDetectionInput([series]))).toEqual([]);
  });
});
