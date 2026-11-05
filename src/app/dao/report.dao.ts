import { Injectable } from '@angular/core';
import { type Observable, of } from 'rxjs';

import { ANALYST_REPORTS } from '#data/analyst-report.data';
import { type AnalystReport } from '#models/analyst-report.model';

@Injectable({ providedIn: 'root' })
export class ReportDao {
  public getAll(): Observable<AnalystReport[]> {
    return of([...ANALYST_REPORTS]);
  }
}
