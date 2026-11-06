import { dayPoints, daysPoints, localDayOf, makeDetectionInput, makeDetectionSeries } from '#testing/detection';

import { detectHeatingSetpoint } from './heating-setpoint.utils';

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function buildInput(setpointAt: (hour: number, offset: number) => number, withEnergy = true) {
  const setpoint = makeDetectionSeries('heating-setpoint', daysPoints(DAYS, setpointAt), {
    equipmentId: 'eq-ahu',
    type: 'hvac-unit',
  });
  const energy = makeDetectionSeries('active-energy', daysPoints(DAYS, () => 1), {
    equipmentId: 'eq-hvac-meter',
    meterScope: 'hvac',
  });
  return makeDetectionInput(withEnergy ? [setpoint, energy] : [setpoint]);
}

describe('detectHeatingSetpoint', () => {
  it('should flag a building whose setpoint stays at 23 °C', () => {
    const findings = detectHeatingSetpoint(buildInput(() => 23));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'heating-setpoint:bld-test',
      kind: 'heating-setpoint',
      category: 'waste',
      observed: 23,
      reference: 21,
      unit: '°C',
      occurrences: 14,
      evidence: [{ equipmentId: 'eq-ahu', metric: 'heating-setpoint' }],
    });
  });

  it('should value the excess as HVAC energy × 7 % × degrees above 21 °C', () => {
    const [finding] = detectHeatingSetpoint(buildInput(() => 23));

    expect(finding?.excessEnergyKwh).toBeCloseTo(14 * 24 * 0.07 * 2, 6);
  });

  it('should not fire at a median of 21.5 °C and fire at 21.6 °C', () => {
    expect(detectHeatingSetpoint(buildInput(() => 21.5))).toEqual([]);
    expect(detectHeatingSetpoint(buildInput(() => 21.6))).toHaveLength(1);
  });

  it('should return nothing at the 21 °C reference', () => {
    expect(detectHeatingSetpoint(buildInput(() => 21))).toEqual([]);
  });

  it('should count and value only the days above 21.5 °C', () => {
    const [finding] = detectHeatingSetpoint(buildInput((_hour, offset) => (offset < 8 ? 23 : 21)));

    expect(finding?.occurrences).toBe(8);
    expect(finding?.observed).toBe(23);
    expect(finding?.excessEnergyKwh).toBeCloseTo(8 * 24 * 0.07 * 2, 6);
  });

  it('should only judge fully covered days', () => {
    const setpoint = makeDetectionSeries('heating-setpoint', [
      ...dayPoints(localDayOf(0), () => 23, 60, 0, 19),
      ...daysPoints([1, 2], () => 23),
    ]);

    const [finding] = detectHeatingSetpoint(makeDetectionInput([setpoint]));

    expect(finding?.occurrences).toBe(2);
  });

  it('should leave the excess unknown without HVAC sub-meter', () => {
    const [finding] = detectHeatingSetpoint(buildInput(() => 23, false));

    expect(finding?.excessEnergyKwh).toBeNull();
  });

  it('should return nothing without setpoint series, with only null readings, or without covered day', () => {
    expect(detectHeatingSetpoint(makeDetectionInput([]))).toEqual([]);
    const empty = makeDetectionSeries('heating-setpoint', daysPoints([0, 1], () => null));
    expect(detectHeatingSetpoint(makeDetectionInput([empty]))).toEqual([]);
    const partial = makeDetectionSeries('heating-setpoint', dayPoints(localDayOf(0), () => 23, 60, 0, 10));
    expect(detectHeatingSetpoint(makeDetectionInput([partial]))).toEqual([]);
  });
});
