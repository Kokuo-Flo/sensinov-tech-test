import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { BuildingDao } from '#dao/building.dao';
import { ReferenceDao } from '#dao/reference.dao';
import { type Country } from '#models/country.model';
import { provideServiceMock } from '#testing/service-mock';
import { makeBuilding } from '#testing/fixtures';
import { settle } from '#testing/settle';

import { BuildingListService } from './building-list.service';

const POLAND: Country = {
  code: 'PL',
  name: 'Pologne',
  gridEmissionFactorKgCo2ePerKwh: 0.7,
  electricityPriceEurPerKwh: 0.2,
};

function setup(
  buildings: ReturnType<BuildingDao['getAll']>,
  countries: ReturnType<ReferenceDao['getCountries']>,
): BuildingListService {
  TestBed.configureTestingModule({
    providers: [
      provideServiceMock(BuildingDao, { getAll: () => buildings }),
      provideServiceMock(ReferenceDao, { getCountries: () => countries }),
    ],
  });
  return TestBed.inject(BuildingListService);
}

describe('BuildingListService', () => {
  it('should add the country name to each building', async () => {
    const service = setup(of([makeBuilding({ id: 'a' })]), of([POLAND]));

    await settle();

    expect(service.buildings().map((b) => [b.id, b.countryName])).toEqual([['a', 'Pologne']]);
    expect(service.problem()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('should fall back to the country code when countries are unavailable', async () => {
    const service = setup(
      of([makeBuilding()]),
      throwError(() => new Error('down')),
    );

    await settle();

    expect(service.buildings().map((b) => b.countryName)).toEqual(['PL']);
    expect(service.problem()).toBeNull();
  });

  it('should fall back to the country code when the country is unknown', async () => {
    const service = setup(of([makeBuilding({ countryCode: 'FR' })]), of([POLAND]));

    await settle();

    expect(service.buildings().map((b) => b.countryName)).toEqual(['FR']);
  });

  it('should be loading while buildings are pending', async () => {
    const service = setup(NEVER, of([]));

    await settle();

    expect(service.isLoading()).toBe(true);
    expect(service.buildings()).toEqual([]);
  });

  it('should expose an unknown-error problem when buildings fail', async () => {
    const error = new Error('down');
    const service = setup(
      throwError(() => error),
      of([POLAND]),
    );

    await settle();

    expect(service.problem()?.type).toBe('unknown-error');
    expect(service.buildings()).toEqual([]);
  });

  it('should expose an empty list when there is no building', async () => {
    const service = setup(of([]), of([POLAND]));

    await settle();

    expect(service.buildings()).toEqual([]);
    expect(service.problem()).toBeNull();
  });
});
