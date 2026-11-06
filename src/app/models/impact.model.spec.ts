import { isPrioritySortKey } from './impact.model';

describe('isPrioritySortKey', () => {
  it.each(['emissions', 'cost', 'energy'])('should accept %s', (key) => {
    expect(isPrioritySortKey(key)).toBe(true);
  });

  it.each(['', 'Emissions', 'co2', 'kwh'])('should reject « %s »', (key) => {
    expect(isPrioritySortKey(key)).toBe(false);
  });
});
