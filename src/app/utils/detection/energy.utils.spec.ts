import { toKwh, whToKwh } from './energy.utils';

describe('energy utils', () => {
  it('should convert Wh to kWh', () => {
    expect(whToKwh(2500)).toBe(2.5);
  });

  it('should convert a Wh value and leave a kWh value as is', () => {
    expect(toKwh(1500, 'Wh')).toBe(1.5);
    expect(toKwh(1.5, 'kWh')).toBe(1.5);
  });

  it('should return a value of unknown unit unchanged', () => {
    expect(toKwh(42, 'MJ')).toBe(42);
  });
});
