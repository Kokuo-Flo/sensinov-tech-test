import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';

import { ProblemMessagePipe } from '#pipes/problem-message.pipe';

import { AnalystReportService } from './analyst-report.service';

@Component({
  selector: 'sb-analyst-report',
  imports: [DatePipe, MatCard, MatCardContent, MatProgressBar, ProblemMessagePipe],
  templateUrl: './analyst-report.component.html',
})
export class AnalystReportComponent {
  // --- Injections ---
  private readonly _analystReportService = inject(AnalystReportService);

  // --- Signals from services ---
  public readonly reports = this._analystReportService.reports;
  public readonly isLoading = this._analystReportService.isLoading;
  public readonly problem = this._analystReportService.problem;
}
