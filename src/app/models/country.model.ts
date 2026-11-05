export const COUNTRY_CODES = ['FR', 'DE', 'PL', 'ES', 'IT', 'NL', 'BE'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface Country {
  readonly code: CountryCode;
  /** French label. */
  readonly name: string;
  /** Location-based electricity emission factor. */
  readonly gridEmissionFactorKgCo2ePerKwh: number;
  readonly electricityPriceEurPerKwh: number;
}

export function isCountryCode(value: string): value is CountryCode {
  return COUNTRY_CODES.some((code: CountryCode) => code === value);
}
