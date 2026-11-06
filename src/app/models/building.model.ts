/**
 * Office building of the client portfolio: the unit every screen, detection and impact figure is
 * grouped by.
 */

import { type CountryCode } from './country.model';

export interface Building {
  /** Stable slug, e.g. `'bld-warsaw'`. */
  readonly id: string;
  readonly name: string;

  readonly city: string;
  /** Country, which sets the grid emission factor and electricity price of the building. */
  readonly countryCode: CountryCode;

  /** Floor area, m². */
  readonly surfaceM2: number;
  readonly constructionYear: number;
  readonly floors: number;
  /** Maximum number of occupants (persons). */
  readonly occupancyCapacity: number;

  /** Energy consumed during the commitment baseline year, kWh; base of the emission reduction target. */
  readonly baselineAnnualEnergyKwh: number;
}
