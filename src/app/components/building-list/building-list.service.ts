import { computed, Injectable, inject, type Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { BuildingDao } from '#dao/building.dao';
import { ReferenceDao } from '#dao/reference.dao';
import { type Building } from '#models/building.model';
import { type Country, type CountryCode } from '#models/country.model';
import { type DataProblem } from '#models/data-problem.model';
import { toDataProblem } from '#utils/data-problem.utils';

@Injectable({ providedIn: 'root' })
export class BuildingListService {
  // --- Injections ---
  private readonly _buildingDao = inject(BuildingDao);
  private readonly _referenceDao = inject(ReferenceDao);

  // --- Internal signals ---
  private readonly _buildingsResource = rxResource({
    stream: () => this._buildingDao.getAll(),
    defaultValue: [],
  });
  private readonly _countriesResource = rxResource({
    stream: () => this._referenceDao.getCountries(),
    defaultValue: [],
  });

  private readonly _countryNames = computed(
    () =>
      new Map(
        (this._countriesResource.hasValue() ? this._countriesResource.value() : []).map(
          (country: Country) => [country.code, country.name] as const,
        ),
      ),
  );

  /** Country names are a secondary lookup: when they are unavailable the raw country code is shown. */
  public readonly buildings = computed(() => {
    const buildings = this._buildingsResource.hasValue() ? this._buildingsResource.value() : [];
    const countryNames: ReadonlyMap<CountryCode, string> = this._countryNames();
    return buildings.map((building: Building) => ({
      ...building,
      countryName: countryNames.get(building.countryCode) ?? building.countryCode,
    }));
  });
  public readonly isLoading: Signal<boolean> = this._buildingsResource.isLoading;
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._buildingsResource.error();
    return error === undefined ? null : toDataProblem(error);
  });
}
