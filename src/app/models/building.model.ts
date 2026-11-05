import { type CountryCode } from './country.model';

export interface Building {
  /** e.g. `'bld-warsaw'`. */
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly countryCode: CountryCode;
  readonly surfaceM2: number;
  readonly constructionYear: number;
  readonly floors: number;
  /** Persons. */
  readonly occupancyCapacity: number;
  /** Reference year consumption (commitment baseline). */
  readonly baselineAnnualEnergyKwh: number;
}
