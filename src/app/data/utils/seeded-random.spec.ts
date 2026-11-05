import { SeededRandom, seedFromText } from './seeded-random';

const draw = (random: SeededRandom, count: number): number[] =>
  Array.from({ length: count }, () => random.next());

describe('SeededRandom', () => {
  it('should produce the same sequence for the same seed', () => {
    expect(draw(new SeededRandom(42), 20)).toEqual(draw(new SeededRandom(42), 20));
  });

  it('should produce different sequences for different seeds', () => {
    expect(draw(new SeededRandom(1), 20)).not.toEqual(draw(new SeededRandom(2), 20));
  });

  it('should return next() values in [0, 1)', () => {
    const values = draw(new SeededRandom(7), 2000);

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    expect(new Set(values).size).toBeGreaterThan(1990);
  });

  it('should return between() values in [min, max)', () => {
    const random = new SeededRandom(9);
    const values = Array.from({ length: 1000 }, () => random.between(-5, 3));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(-5);
    expect(Math.max(...values)).toBeLessThan(3);
  });

  it('should keep noise within the amplitude and centered on 0', () => {
    const random = new SeededRandom(11);
    const values = Array.from({ length: 5000 }, () => random.noise(2));
    const mean = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;

    expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(2);
    expect(Math.abs(mean)).toBeLessThan(0.05);
  });

  it('should return 0 noise bounded to 0 for a null amplitude', () => {
    expect(new SeededRandom(3).noise(0)).toBeCloseTo(0, 12);
  });
});

describe('seedFromText', () => {
  it('should be stable for the same text', () => {
    expect(seedFromText('eq-paris-ahu:hvac-status')).toBe(seedFromText('eq-paris-ahu:hvac-status'));
  });

  it('should discriminate close texts', () => {
    const seeds = new Set(
      ['a:1', 'a:2', 'b:1', 'eq-paris-ahu:hvac-status', 'eq-paris-ahu:heating-setpoint'].map(
        seedFromText,
      ),
    );

    expect(seeds.size).toBe(5);
  });

  it('should return an unsigned 32-bit integer', () => {
    const seed = seedFromText('any text');

    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });

  it('should return the FNV-1a offset basis for an empty text', () => {
    expect(seedFromText('')).toBe(0x811c9dc5);
  });
});
