import { KwhPipe } from './kwh.pipe';

describe('KwhPipe', () => {
  const pipe = new KwhPipe();

  it('should round to the unit with French thousands grouping', () => {
    expect(pipe.transform(113_758.4).replace(/\s/g, ' ')).toBe('113 758 kWh');
  });

  it('should keep small and zero values', () => {
    expect(pipe.transform(0)).toBe('0 kWh');
    expect(pipe.transform(0.6)).toBe('1 kWh');
  });
});
