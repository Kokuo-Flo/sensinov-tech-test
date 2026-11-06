import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  MatButtonToggle,
  type MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
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
import { isPrioritySortKey } from '#models/impact.model';
import { ConfidenceLabelPipe } from '#pipes/confidence-label.pipe';
import { EurosPipe } from '#pipes/euros.pipe';
import { FindingKindLabelPipe } from '#pipes/finding-kind-label.pipe';
import { KwhPipe } from '#pipes/kwh.pipe';
import { ProblemMessagePipe } from '#pipes/problem-message.pipe';
import { TonnesCo2ePipe } from '#pipes/tonnes-co2e.pipe';
import { PriorityService } from '#services/priority.service';

@Component({
  selector: 'sb-priorities',
  imports: [
    DecimalPipe,
    PercentPipe,
    RouterLink,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatCard,
    MatCardContent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
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
    ConfidenceLabelPipe,
    EurosPipe,
    FindingKindLabelPipe,
    KwhPipe,
    ProblemMessagePipe,
    TonnesCo2ePipe,
  ],
  templateUrl: './priorities.component.html',
  styleUrl: './priorities.component.scss',
})
export class PrioritiesComponent {
  // --- Injections ---
  private readonly _priorityService = inject(PriorityService);

  // --- Constants ---
  public readonly COLUMNS = [
    'rank',
    'building',
    'kind',
    'energy',
    'cost',
    'emissions',
    'confidence',
    'evidence',
  ] as const;

  // --- Signals from services ---
  public readonly rows = this._priorityService.rows;
  public readonly totals = this._priorityService.totals;
  public readonly estimatedReduction = this._priorityService.estimatedReduction;
  public readonly assumptions = this._priorityService.assumptions;
  public readonly dataQualityBuildings = this._priorityService.dataQualityBuildings;
  public readonly sortKey = this._priorityService.sortKey;
  public readonly isLoading = this._priorityService.isLoading;
  public readonly problem = this._priorityService.problem;

  // --- Internal signals ---
  public readonly hasDataQualityBuildings = computed(() => this.dataQualityBuildings().length > 0);

  public onSelectSortKey(event: MatButtonToggleChange): void {
    const value: unknown = event.value;
    if (typeof value !== 'string' || !isPrioritySortKey(value)) {
      return;
    }
    this._priorityService.selectSortKey(value);
  }
}
