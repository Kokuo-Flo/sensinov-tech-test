import { type DataQualityDefect } from '#models/injected-anomaly.model';

import { applyDataQualityDefects } from './data-quality';

const FROM = '2026-10-12T00:00:00.000Z';
const TO = '2026-10-13T00:00:00.000Z';

const FROZEN: DataQualityDefect = {
  code: 'DQ1',
  kind: 'frozen-sensor',
  buildingId: 'bld-x',
  description: 'frozen',
  equipmentId: 'eq-x',
  metric: 'indoor-temperature',
  from: FROM,
  to: TO,
  frozenValue: 21.4,
};
const MISSING: DataQualityDefect = {
  code: 'DQ2',
  kind: 'missing-data',
  buildingId: 'bld-x',
  description: 'missing',
  equipmentId: 'eq-x',
  metric: 'active-energy',
  from: FROM,
  to: TO,
};

describe('applyDataQualityDefects', () => {
  it('should keep the value when there is no defect', () => {
    expect(applyDataQualityDefects(19.8, Date.parse(FROM), [])).toBe(19.8);
  });

  it('should replace the value by the frozen value inside the range', () => {
    expect(applyDataQualityDefects(19.8, Date.parse(FROM), [FROZEN])).toBe(21.4);
  });

  it('should return null inside a missing-data range', () => {
    expect(applyDataQualityDefects(5, Date.parse(FROM) + 1000, [MISSING])).toBeNull();
  });

  it('should treat the upper bound as excluded and the point before the range as untouched', () => {
    expect(applyDataQualityDefects(5, Date.parse(TO), [MISSING])).toBe(5);
    expect(applyDataQualityDefects(5, Date.parse(FROM) - 1, [MISSING])).toBe(5);
  });
});
