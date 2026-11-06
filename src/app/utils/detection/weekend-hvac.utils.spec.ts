import {
  dayPoints,
  daysPoints,
  localDayOf,
  makeDetectionInput,
  makeDetectionSeries,
  weekendOffsets,
} from '#testing/detection';

import { detectWeekendHvac } from './weekend-hvac.utils';

const WEEKENDS = weekendOffsets(8);

interface Options {
  /** Weekend offsets whose HVAC runs. */
  readonly running?: readonly number[];
  readonly runFrom?: number;
  readonly runTo?: number;
  readonly occupancyAt?: (hour: number) => number;
  readonly withEnergy?: boolean;
  readonly withOccupancy?: boolean;
}

function buildInput(options: Options = {}): ReturnType<typeof makeDetectionInput> {
  const { running = WEEKENDS, runFrom = 8, runTo = 18, occupancyAt = () => 0 } = options;
  const status = makeDetectionSeries(
    'hvac-status',
    daysPoints(WEEKENDS, (hour, offset) => (running.includes(offset) && hour >= runFrom && hour < runTo ? 1 : 0)),
    { equipmentId: 'eq-ahu', type: 'hvac-unit' },
  );
  const occupancy = makeDetectionSeries('occupancy-count', daysPoints(WEEKENDS, occupancyAt), {
    equipmentId: 'eq-occ',
    type: 'occupancy-sensor',
  });
  const energy = makeDetectionSeries('active-energy', daysPoints(WEEKENDS, () => 2), {
    equipmentId: 'eq-hvac-meter',
    meterScope: 'hvac',
  });
  return makeDetectionInput([
    status,
    ...(options.withOccupancy === false ? [] : [occupancy]),
    ...(options.withEnergy === false ? [] : [energy]),
  ]);
}

describe('detectWeekendHvac', () => {
  it('should flag a building whose HVAC runs every empty weekend', () => {
    const findings = detectWeekendHvac(buildInput());

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'weekend-hvac:bld-test',
      kind: 'weekend-hvac',
      category: 'waste',
      observed: 16,
      reference: 16,
      unit: 'days',
      occurrences: 16,
      firstSeenAt: dayPoints(localDayOf(5), () => 0)[0]?.timestamp,
      evidence: [
        { equipmentId: 'eq-ahu', metric: 'hvac-status' },
        { equipmentId: 'eq-occ', metric: 'occupancy-count' },
      ],
    });
  });

  it('should value the excess as the whole HVAC energy of the flagged weekend days', () => {
    const [finding] = detectWeekendHvac(buildInput());

    expect(finding?.excessEnergyKwh).toBe(16 * 24 * 2);
  });

  it('should only count the energy of flagged days when some weekends are clean', () => {
    const running = WEEKENDS.slice(0, 8);

    const [finding] = detectWeekendHvac(buildInput({ running }));

    expect(finding).toMatchObject({ observed: 8, reference: 16, excessEnergyKwh: 8 * 24 * 2 });
  });

  it('should fire at 8 of 16 weekend days and not at 7 of 16', () => {
    expect(detectWeekendHvac(buildInput({ running: WEEKENDS.slice(0, 8) }))).toHaveLength(1);
    expect(detectWeekendHvac(buildInput({ running: WEEKENDS.slice(0, 7) }))).toEqual([]);
  });

  it('should accept 4 h of running and refuse 3 h', () => {
    expect(detectWeekendHvac(buildInput({ runFrom: 8, runTo: 12 }))).toHaveLength(1);
    expect(detectWeekendHvac(buildInput({ runFrom: 8, runTo: 11 }))).toEqual([]);
  });

  it('should exclude a day when occupancy reaches 5 % of capacity during the run', () => {
    expect(detectWeekendHvac(buildInput({ occupancyAt: (hour) => (hour === 10 ? 5 : 0) }))).toEqual([]);
    expect(detectWeekendHvac(buildInput({ occupancyAt: (hour) => (hour === 10 ? 4.9 : 0) }))).toHaveLength(1);
  });

  it('should ignore occupancy outside the running window', () => {
    expect(detectWeekendHvac(buildInput({ occupancyAt: (hour) => (hour === 20 ? 50 : 0) }))).toHaveLength(1);
  });

  it('should not flag a day whose running window has no occupancy reading', () => {
    const occupancy = makeDetectionSeries('occupancy-count', [], { equipmentId: 'eq-occ' });
    const input = buildInput();

    const result = detectWeekendHvac({ ...input, series: [...input.series.filter((s) => s.metric !== 'occupancy-count'), occupancy] });

    expect(result).toEqual([]);
  });

  it('should leave days without full coverage out of the reference', () => {
    const status = makeDetectionSeries(
      'hvac-status',
      [
        ...daysPoints([5, 6], (hour) => (hour >= 8 && hour < 18 ? 1 : 0)),
        ...dayPoints(localDayOf(12), () => 1, 60, 0, 10),
      ],
    );
    const occupancy = makeDetectionSeries('occupancy-count', daysPoints([5, 6, 12], () => 0));

    const [finding] = detectWeekendHvac(makeDetectionInput([status, occupancy]));

    expect(finding).toMatchObject({ observed: 2, reference: 2 });
  });

  it('should leave the excess unknown without HVAC sub-meter', () => {
    const [finding] = detectWeekendHvac(buildInput({ withEnergy: false }));

    expect(finding?.excessEnergyKwh).toBeNull();
  });

  it('should return nothing without occupancy series or HVAC status', () => {
    expect(detectWeekendHvac(buildInput({ withOccupancy: false }))).toEqual([]);
    expect(detectWeekendHvac(makeDetectionInput([]))).toEqual([]);
  });

  it('should return nothing when no weekend is covered', () => {
    const status = makeDetectionSeries('hvac-status', daysPoints([0, 1], () => 1));
    const occupancy = makeDetectionSeries('occupancy-count', daysPoints([0, 1], () => 0));

    expect(detectWeekendHvac(makeDetectionInput([status, occupancy]))).toEqual([]);
  });
});
