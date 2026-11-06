import {
  dayPoints,
  daysPoints,
  makeDetectionInput,
  makeDetectionSeries,
  weekendOffsets,
  workingOffsets,
} from '#testing/detection';

import { detectEarlyHvacStart, EARLY_HVAC_RECOVERABLE_SHARE } from './early-hvac-start.utils';

const WORKING = workingOffsets(2);

interface Options {
  readonly startAt?: (offset: number) => number;
  readonly arrivalAt?: (offset: number) => number;
  readonly statusInterval?: 15 | 60;
  readonly withEnergy?: boolean;
}

function buildInput(options: Options = {}) {
  const { startAt = () => 4, arrivalAt = () => 7, statusInterval = 60, withEnergy = true } = options;
  const status = makeDetectionSeries(
    'hvac-status',
    daysPoints(WORKING, (hour, offset) => (hour >= startAt(offset) && hour < 20 ? 1 : 0), statusInterval),
    { equipmentId: 'eq-ahu', type: 'hvac-unit', intervalMinutes: statusInterval },
  );
  const occupancy = makeDetectionSeries(
    'occupancy-count',
    daysPoints(WORKING, (hour, offset) => (hour >= arrivalAt(offset) && hour < 18 ? 50 : 0)),
    { equipmentId: 'eq-occ', type: 'occupancy-sensor' },
  );
  const energy = makeDetectionSeries('active-energy', daysPoints(WORKING, () => 1), {
    equipmentId: 'eq-hvac-meter',
    meterScope: 'hvac',
  });
  return makeDetectionInput([status, occupancy, ...(withEnergy ? [energy] : [])]);
}

describe('detectEarlyHvacStart', () => {
  it('should flag an HVAC started 3 h before arrival, observed = median start, reference = median arrival', () => {
    const findings = detectEarlyHvacStart(buildInput());

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'early-hvac-start:bld-test',
      kind: 'early-hvac-start',
      category: 'waste',
      observed: 4,
      reference: 7,
      unit: 'h',
      occurrences: 10,
      evidence: [
        { equipmentId: 'eq-ahu', metric: 'hvac-status' },
        { equipmentId: 'eq-occ', metric: 'occupancy-count' },
      ],
    });
  });

  it('should not fire at a 2 h lead and fire above', () => {
    expect(detectEarlyHvacStart(buildInput({ startAt: () => 5, arrivalAt: () => 7 }))).toEqual([]);
    expect(detectEarlyHvacStart(buildInput({ startAt: () => 4.75, arrivalAt: () => 7, statusInterval: 15 }))).toHaveLength(1);
  });

  it('should value the energy between the start and arrival − 1 h, times the recoverable share', () => {
    const [finding] = detectEarlyHvacStart(buildInput());

    expect(EARLY_HVAC_RECOVERABLE_SHARE).toBe(0.5);
    expect(finding?.excessEnergyKwh).toBeCloseTo(10 * 2 * 1 * 0.5, 6);
  });

  it('should prorate a partially covered energy interval', () => {
    const [finding] = detectEarlyHvacStart(buildInput({ startAt: () => 4.5, statusInterval: 15 }));

    expect(finding?.observed).toBe(4.5);
    expect(finding?.excessEnergyKwh).toBeCloseTo(10 * 1.5 * 0.5, 6);
  });

  it('should count and value only the days with a lead above 2 h', () => {
    const [finding] = detectEarlyHvacStart(buildInput({ startAt: (offset) => (offset < 8 && offset % 7 < 5 ? 4 : 6) }));

    expect(finding?.occurrences).toBe(6);
    expect(finding?.excessEnergyKwh).toBeCloseTo(6 * 2 * 0.5, 6);
  });

  it('should leave the excess unknown without HVAC sub-meter', () => {
    const [finding] = detectEarlyHvacStart(buildInput({ withEnergy: false }));

    expect(finding?.excessEnergyKwh).toBeNull();
  });

  it('should skip days where occupants never arrive or the HVAC never runs', () => {
    const status = makeDetectionSeries('hvac-status', daysPoints(WORKING, () => 0));
    const occupancy = makeDetectionSeries('occupancy-count', daysPoints(WORKING, () => 50));

    expect(detectEarlyHvacStart(makeDetectionInput([status, occupancy]))).toEqual([]);
    const quiet = makeDetectionSeries('occupancy-count', daysPoints(WORKING, () => 0));
    const running = makeDetectionSeries('hvac-status', daysPoints(WORKING, (hour) => (hour >= 3 ? 1 : 0)));
    expect(detectEarlyHvacStart(makeDetectionInput([running, quiet]))).toEqual([]);
  });

  it('should ignore weekends and days without full coverage', () => {
    const weekends = weekendOffsets(2);
    const status = makeDetectionSeries('hvac-status', [
      ...daysPoints(weekends, (hour) => (hour >= 2 ? 1 : 0)),
      ...dayPoints('2026-09-07', (hour) => (hour >= 2 ? 1 : 0), 60, 0, 10),
    ]);
    const occupancy = makeDetectionSeries('occupancy-count', [
      ...daysPoints(weekends, (hour) => (hour >= 9 ? 50 : 0)),
      ...dayPoints('2026-09-07', (hour) => (hour >= 9 ? 50 : 0)),
    ]);

    expect(detectEarlyHvacStart(makeDetectionInput([status, occupancy]))).toEqual([]);
  });

  it('should return nothing without HVAC status or occupancy', () => {
    expect(detectEarlyHvacStart(makeDetectionInput([]))).toEqual([]);
    const input = buildInput();
    expect(detectEarlyHvacStart({ ...input, series: input.series.filter((s) => s.metric !== 'occupancy-count') })).toEqual([]);
  });
});
