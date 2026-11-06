import {
  daysPoints,
  makeDetectionInput,
  makeDetectionSeries,
  weekendOffsets,
  workingOffsets,
} from '#testing/detection';

import { detectNightBaseload } from './night-baseload.utils';

const WORKING = workingOffsets(2);
const WEEKENDS = weekendOffsets(2);
const ALL = [...WORKING, ...WEEKENDS].sort((a, b) => a - b);

const PLATEAU = 10;

function buildInput(
  nightAt: (offset: number) => number,
  options: { plateauAt?: (offset: number) => number; scope?: 'lighting-plugs' | 'main'; interval?: 15 | 60 } = {},
) {
  const { plateauAt = () => PLATEAU, scope = 'lighting-plugs', interval = 60 } = options;
  const series = makeDetectionSeries(
    'active-energy',
    daysPoints(ALL, (hour, offset) => (hour < 5 ? nightAt(offset) : plateauAt(offset)), interval),
    { equipmentId: 'eq-lighting', meterScope: scope, intervalMinutes: interval },
  );
  return makeDetectionInput([series]);
}

describe('detectNightBaseload', () => {
  it('should flag a night power at 60 % of the day power', () => {
    const findings = detectNightBaseload(buildInput(() => 6));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'night-baseload:bld-test',
      kind: 'night-baseload',
      category: 'waste',
      observed: 0.6,
      reference: 0.2,
      unit: 'ratio',
      occurrences: 10,
      evidence: [{ equipmentId: 'eq-lighting', metric: 'active-energy' }],
    });
  });

  it('should value the excess as (night kW − 0.2 × day kW) × 12 h per flagged working day', () => {
    const [finding] = detectNightBaseload(buildInput(() => 6));

    expect(finding?.excessEnergyKwh).toBeCloseTo(10 * (6 - 0.2 * PLATEAU) * 12, 6);
  });

  it('should derive kW from the sampling interval (15 min: 1 kWh = 4 kW)', () => {
    const [finding] = detectNightBaseload(buildInput(() => 1.5, { plateauAt: () => 2.5, interval: 15 }));

    expect(finding?.observed).toBeCloseTo(0.6, 6);
    expect(finding?.excessEnergyKwh).toBeCloseTo(10 * (6 - 0.2 * 10) * 12, 6);
  });

  it('should not fire at a median ratio of 0.40 and fire at 0.41', () => {
    expect(detectNightBaseload(buildInput(() => 4))).toEqual([]);
    expect(detectNightBaseload(buildInput(() => 4.1))).toHaveLength(1);
  });

  it('should leave weekends out', () => {
    const input = buildInput((offset) => (WEEKENDS.includes(offset) ? 9 : 2));

    expect(detectNightBaseload(input)).toEqual([]);
  });

  it('should flag only the days above 0.4 when the median is above', () => {
    const [finding] = detectNightBaseload(buildInput((offset) => (offset < 8 && offset % 7 < 5 ? 6 : 3)));

    expect(finding?.occurrences).toBe(6);
    expect(finding?.excessEnergyKwh).toBeCloseTo(6 * (6 - 2) * 12, 6);
  });

  it('should ignore a day whose power is zero', () => {
    const withZeroDay = detectNightBaseload(
      buildInput(() => 6, { plateauAt: (offset) => (offset === 0 ? 0 : PLATEAU) }),
    );

    expect(withZeroDay[0]?.occurrences).toBe(9);
  });

  it('should return nothing without lighting & plugs sub-meter', () => {
    expect(detectNightBaseload(buildInput(() => 6, { scope: 'main' }))).toEqual([]);
  });

  it('should return nothing when no working day is covered', () => {
    const series = makeDetectionSeries('active-energy', daysPoints(WEEKENDS, () => 6), {
      meterScope: 'lighting-plugs',
    });

    expect(detectNightBaseload(makeDetectionInput([series]))).toEqual([]);
  });
});
