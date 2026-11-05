import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ReferenceDao } from './reference.dao';

describe('ReferenceDao', () => {
  let dao: ReferenceDao;

  beforeEach(() => {
    dao = TestBed.inject(ReferenceDao);
  });

  it('should return the 7 countries of the dataset', async () => {
    const countries = await firstValueFrom(dao.getCountries());

    expect(countries).toHaveLength(7);
    expect(countries.find((c) => c.code === 'PL')?.name).toBe('Pologne');
  });

  it('should return the emission commitment 2025 to 2028 at -30 %', async () => {
    const commitment = await firstValueFrom(dao.getCommitment());

    expect(commitment).toEqual({
      baselineYear: 2025,
      targetYear: 2028,
      targetReductionPercent: 30,
    });
  });
});
