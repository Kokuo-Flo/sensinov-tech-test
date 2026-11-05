import { isCountryCode } from './country.model';

describe('isCountryCode', () => {
  it('should accept a supported country code', () => {
    expect(isCountryCode('PL')).toBe(true);
  });

  it.each(['', 'fr', 'US'])('should reject "%s"', (value: string) => {
    expect(isCountryCode(value)).toBe(false);
  });
});
