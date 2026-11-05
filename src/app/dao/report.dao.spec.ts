import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ReportDao } from './report.dao';

describe('ReportDao', () => {
  it('should return the analyst report with its 6 recommendations', async () => {
    const reports = await firstValueFrom(TestBed.inject(ReportDao).getAll());

    expect(reports).toHaveLength(1);
    expect(reports.flatMap((r) => r.recommendations)).toHaveLength(6);
  });
});
