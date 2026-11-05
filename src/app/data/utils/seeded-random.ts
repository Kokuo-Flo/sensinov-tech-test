/** Deterministic pseudo-random generator (mulberry32): same seed, same sequence. */
export class SeededRandom {
  private _state: number;

  constructor(seed: number) {
    this._state = seed >>> 0;
  }

  /** Float in [0, 1). */
  public next(): number {
    this._state = (this._state + 0x6d2b79f5) >>> 0;
    let value = this._state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  public between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Approximately normal noise centered on 0 (sum of uniforms). */
  public noise(amplitude: number): number {
    return (this.next() + this.next() + this.next() - 1.5) * (amplitude / 1.5);
  }
}

/** Stable 32-bit seed derived from a text key (FNV-1a), e.g. `seedFromText('eq-paris-ahu:hvac-status')`. */
export function seedFromText(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
