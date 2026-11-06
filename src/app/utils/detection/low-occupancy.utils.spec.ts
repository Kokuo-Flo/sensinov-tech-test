import {
  daysPoints,
  makeDetectionInput,
  makeDetectionSeries,
  weekendOffsets,
  workingOffsets,
} from '#testing/detection';

import { detectLowOccupancy } from './low-occupancy.utils';

const WORKING = workingOffsets(2);
const ALL = [...WORKING, ...weekendOffsets(2)].sort((a, b) => a - b);

interface Options {
  readonly peakAt?: (offset: number) => number;
  readonly runningHours?: number;
  readonly capacity?: number;
  readonly withEnergy?: boolean;
  readonly withStatus?: boolean;
}

function buildInput(options: Options = {}) {
  const { peakAt = () => 30, runningHours = 11, capacity = 100, withEnergy = true, withStatus = true } = options;
  const occupancy = makeDetectionSeries(
    'occupancy-count',
    daysPoints(ALL, (hour, offset) => (hour === 12 ? peakAt(offset) : 1)),
    { equipmentId: 'eq-occ', type: 'occupancy-sensor' },
  );
  const status = makeDetectionSeries(
    'hvac-status',
    daysPoints(ALL, (hour) => (hour >= 7 && hour < 7 + runningHours ? 1 : 0)),
    { equipmentId: 'eq-ahu', type: 'hvac-unit' },
  );
  const energy = makeDetectionSeries('active-energy', daysPoints(ALL, () => 1), {
    equipmentId: 'eq-hvac-meter',
    meterScope: 'hvac',
  });
  return makeDetectionInput(
    [occupancy, ...(withStatus ? [status] : []), ...(withEnergy ? [energy] : [])],
    capacity,
  );
}

describe('detectLowOccupancy', () => {
  it('should flag a building peaking at 30 % of capacity with a full HVAC schedule', () => {
    const findings = detectLowOccupancy(buildInput());

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'low-occupancy:bld-test',
      kind: 'low-occupancy',
      category: 'waste',
      observed: 0.3,
      reference: 0.4,
      unit: 'ratio',
      occurrences: 10,
      evidence: [
        { equipmentId: 'eq-occ', metric: 'occupancy-count' },
        { equipmentId: 'eq-ahu', metric: 'hvac-status' },
      ],
    });
  });

  it('should value the excess as flagged-day HVAC energy × (1 − peak / 0.65) × 0.5', () => {
    const [finding] = detectLowOccupancy(buildInput());

    expect(finding?.excessEnergyKwh).toBeCloseTo(10 * 24 * (1 - 0.3 / 0.65) * 0.5, 6);
  });

  it('should not fire at a 0.40 peak and fire at 0.39', () => {
    expect(detectLowOccupancy(buildInput({ peakAt: () => 40 }))).toEqual([]);
    expect(detectLowOccupancy(buildInput({ peakAt: () => 39 }))[0]?.observed).toBe(0.39);
  });

  it('should require the HVAC to run 10 h per working day', () => {
    expect(detectLowOccupancy(buildInput({ runningHours: 9 }))).toEqual([]);
    expect(detectLowOccupancy(buildInput({ runningHours: 10 }))).toHaveLength(1);
  });

  it('should only flag and value the days under 0.4 of capacity', () => {
    const [finding] = detectLowOccupancy(buildInput({ peakAt: (offset) => (offset === 0 || offset === 1 ? 70 : 30) }));

    expect(finding?.occurrences).toBe(8);
    expect(finding?.excessEnergyKwh).toBeCloseTo(8 * 24 * (1 - 0.3 / 0.65) * 0.5, 6);
  });

  it('should leave the excess unknown without HVAC sub-meter', () => {
    expect(detectLowOccupancy(buildInput({ withEnergy: false }))[0]?.excessEnergyKwh).toBeNull();
  });

  it('should return nothing with a capacity of 0', () => {
    expect(detectLowOccupancy(buildInput({ capacity: 0 }))).toEqual([]);
  });

  it('should return nothing without HVAC status or occupancy series', () => {
    expect(detectLowOccupancy(buildInput({ withStatus: false }))).toEqual([]);
    expect(detectLowOccupancy(makeDetectionInput([]))).toEqual([]);
  });

  it('should return nothing when no working day is covered', () => {
    const weekend = weekendOffsets(2);
    const occupancy = makeDetectionSeries('occupancy-count', daysPoints(weekend, () => 1));
    const status = makeDetectionSeries('hvac-status', daysPoints(weekend, () => 1));

    expect(detectLowOccupancy(makeDetectionInput([occupancy, status]))).toEqual([]);
  });
});
