import { type Equipment, findMetricDefinition, isMetricKey } from './equipment.model';

const EQUIPMENT: Equipment = {
  id: 'eq-x',
  buildingId: 'bld-x',
  name: 'AHU',
  type: 'hvac-unit',
  vendor: 'V',
  zone: null,
  meterScope: null,
  samplingIntervalMinutes: 15,
  metrics: [
    { key: 'hvac-status', unit: 'on/off' },
    { key: 'heating-setpoint', unit: '°C' },
  ],
};

describe('isMetricKey', () => {
  it('should accept a known metric', () => {
    expect(isMetricKey('active-energy')).toBe(true);
  });

  it.each(['', 'unknown', 'Active-Energy'])('should reject "%s"', (value: string) => {
    expect(isMetricKey(value)).toBe(false);
  });
});

describe('findMetricDefinition', () => {
  it('should return the definition reported by the equipment', () => {
    expect(findMetricDefinition(EQUIPMENT, 'heating-setpoint')).toEqual({
      key: 'heating-setpoint',
      unit: '°C',
    });
  });

  it('should return null when the equipment does not report the metric', () => {
    expect(findMetricDefinition(EQUIPMENT, 'active-energy')).toBeNull();
  });
});
