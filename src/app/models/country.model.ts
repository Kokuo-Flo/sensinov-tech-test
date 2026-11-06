/** Country of a building, carrying the factors that turn kWh into kgCO₂e and euros (impact estimates). */

/** Countries of the portfolio, ISO 3166-1 alpha-2. */
export const COUNTRY_CODES = ['FR', 'DE', 'PL', 'ES', 'IT', 'NL', 'BE'] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface Country {
  readonly code: CountryCode;
  /** French label. */
  readonly name: string;
  /** Location-based electricity emission factor, kgCO₂e per kWh (order of magnitude). */
  readonly gridEmissionFactorKgCo2ePerKwh: number;
  /** Average business electricity price, € per kWh (order of magnitude). */
  readonly electricityPriceEurPerKwh: number;
}

export function isCountryCode(value: string): value is CountryCode {
  return COUNTRY_CODES.some((code: CountryCode) => code === value);
}
