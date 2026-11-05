import { type InjectedAnomaly, isDataQualityDefect } from './injected-anomaly.model';

const BASE = { buildingId: 'bld-x', description: 'd' };

describe('isDataQualityDefect', () => {
  it.each<[string, InjectedAnomaly]>([
    [
      'frozen-sensor',
      {
        ...BASE,
        code: 'DQ1',
        kind: 'frozen-sensor',
        equipmentId: 'e',
        metric: 'indoor-temperature',
        from: 'a',
        to: 'b',
        frozenValue: 1,
      },
    ],
    [
      'missing-data',
      {
        ...BASE,
        code: 'DQ2',
        kind: 'missing-data',
        equipmentId: 'e',
        metric: 'active-energy',
        from: 'a',
        to: 'b',
      },
    ],
  ])('should accept %s', (_label: string, anomaly: InjectedAnomaly) => {
    expect(isDataQualityDefect(anomaly)).toBe(true);
  });

  it.each<[string, InjectedAnomaly]>([
    [
      'weekend-hvac',
      {
        ...BASE,
        code: 'A1',
        kind: 'weekend-hvac',
        weekendStartHour: 8,
        weekendEndHour: 18,
        weekendToWeekdayEnergyRatio: 0.7,
      },
    ],
    ['low-occupancy', { ...BASE, code: 'A5', kind: 'low-occupancy', occupancyRate: 0.3 }],
  ])('should reject %s', (_label: string, anomaly: InjectedAnomaly) => {
    expect(isDataQualityDefect(anomaly)).toBe(false);
  });
});
