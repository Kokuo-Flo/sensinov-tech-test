import { type Country } from '#models/country.model';

/** Orders of magnitude only: location-based electricity factors and average business electricity prices. */
export const COUNTRIES: readonly Country[] = [
  {
    code: 'FR',
    name: 'France',
    gridEmissionFactorKgCo2ePerKwh: 0.05,
    electricityPriceEurPerKwh: 0.22,
  },
  {
    code: 'DE',
    name: 'Allemagne',
    gridEmissionFactorKgCo2ePerKwh: 0.38,
    electricityPriceEurPerKwh: 0.3,
  },
  {
    code: 'PL',
    name: 'Pologne',
    gridEmissionFactorKgCo2ePerKwh: 0.66,
    electricityPriceEurPerKwh: 0.18,
  },
  {
    code: 'ES',
    name: 'Espagne',
    gridEmissionFactorKgCo2ePerKwh: 0.15,
    electricityPriceEurPerKwh: 0.21,
  },
  {
    code: 'IT',
    name: 'Italie',
    gridEmissionFactorKgCo2ePerKwh: 0.26,
    electricityPriceEurPerKwh: 0.27,
  },
  {
    code: 'NL',
    name: 'Pays-Bas',
    gridEmissionFactorKgCo2ePerKwh: 0.33,
    electricityPriceEurPerKwh: 0.25,
  },
  {
    code: 'BE',
    name: 'Belgique',
    gridEmissionFactorKgCo2ePerKwh: 0.16,
    electricityPriceEurPerKwh: 0.28,
  },
];
