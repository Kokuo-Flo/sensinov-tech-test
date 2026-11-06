import { TonnesCo2ePipe } from './tonnes-co2e.pipe';

describe('TonnesCo2ePipe', () => {
  const pipe = new TonnesCo2ePipe();
  const format = (kg: number): string => pipe.transform(kg).replace(/\s/g, ' ');

  it('should show whole tonnes from 10 t', () => {
    expect(format(252_880)).toBe('253 tCO₂e');
    expect(format(10_000)).toBe('10 tCO₂e');
  });

  it('should keep one decimal under 10 t', () => {
    expect(format(5_690)).toBe('5,7 tCO₂e');
    expect(format(9_940)).toBe('9,9 tCO₂e');
    expect(format(0)).toBe('0,0 tCO₂e');
  });

  it('should group thousands of tonnes', () => {
    expect(format(1_906_260)).toBe('1 906 tCO₂e');
  });
});
