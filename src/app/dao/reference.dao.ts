import { Injectable } from '@angular/core';
import { type Observable, of } from 'rxjs';

import { EMISSION_COMMITMENT } from '#data/commitment.data';
import { COUNTRIES } from '#data/country.data';
import { type EmissionCommitment } from '#models/commitment.model';
import { type Country } from '#models/country.model';

@Injectable({ providedIn: 'root' })
export class ReferenceDao {
  public getCountries(): Observable<Country[]> {
    return of([...COUNTRIES]);
  }

  public getCommitment(): Observable<EmissionCommitment> {
    return of(EMISSION_COMMITMENT);
  }
}
