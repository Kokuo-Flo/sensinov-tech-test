import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { TemplateItemDirective } from '#directives/template-item.directive';
import { LOCAL_DATE_PIPE_TIMEZONE } from '#models/local-time.model';
import { DayCountPipe } from '#pipes/day-count.pipe';
import { FindingKindLabelPipe } from '#pipes/finding-kind-label.pipe';
import { FindingStatementPipe } from '#pipes/finding-statement.pipe';
import { ProblemMessagePipe } from '#pipes/problem-message.pipe';

import { FindingsService } from './findings.service';

@Component({
  selector: 'sb-findings',
  imports: [
    DatePipe,
    RouterLink,
    MatCard,
    MatCardContent,
    MatProgressBar,
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatNoDataRow,
    TemplateItemDirective,
    DayCountPipe,
    FindingKindLabelPipe,
    FindingStatementPipe,
    ProblemMessagePipe,
  ],
  providers: [FindingsService],
  templateUrl: './findings.component.html',
})
export class FindingsComponent {
  // --- Injections ---
  private readonly _findingsService = inject(FindingsService);

  // --- Constants ---
  public readonly WASTE_COLUMNS = [
    'building',
    'kind',
    'statement',
    'period',
    'flaggedByAnalyst',
    'evidence',
  ] as const;
  public readonly DATA_QUALITY_COLUMNS = [
    'building',
    'equipment',
    'kind',
    'statement',
    'period',
  ] as const;
  /** Dates are shown in the buildings' local time, the one the detection rules reason in. */
  public readonly LOCAL_TIMEZONE = LOCAL_DATE_PIPE_TIMEZONE;

  // --- Inputs ---
  /** Query parameter `?building=<buildingId>`: restricts the list to one building. */
  public readonly building = input<string>();

  // --- Signals from services ---
  public readonly buildingFilter = this._findingsService.buildingFilter;
  public readonly wasteRows = this._findingsService.wasteRows;
  public readonly dataQualityRows = this._findingsService.dataQualityRows;
  public readonly isLoading = this._findingsService.isLoading;
  public readonly problem = this._findingsService.problem;

  constructor() {
    this._findingsService.connect(this.building);
  }
}
