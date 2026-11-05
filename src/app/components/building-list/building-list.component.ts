import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
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
import { type TableSort } from '#models/table-sort.model';
import { ProblemMessagePipe } from '#pipes/problem-message.pipe';
import { sortRows } from '#utils/table-sort.utils';

import { BuildingListService } from './building-list.service';

@Component({
  selector: 'sb-building-list',
  imports: [
    RouterLink,
    DecimalPipe,
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
    MatSort,
    MatSortHeader,
    TemplateItemDirective,
    ProblemMessagePipe,
  ],
  templateUrl: './building-list.component.html',
})
export class BuildingListComponent {
  // --- Injections ---
  private readonly _buildingListService = inject(BuildingListService);

  // --- Constants ---
  /** Displayed columns, all sortable. */
  public readonly COLUMNS = ['name', 'city', 'countryName', 'surfaceM2', 'constructionYear'] as const;

  // --- Signals from services ---
  public readonly buildings = this._buildingListService.buildings;
  public readonly isLoading = this._buildingListService.isLoading;
  public readonly problem = this._buildingListService.problem;

  // --- Internal signals ---
  private readonly _sort = signal<TableSort>({ active: 'name', direction: 'asc' });

  public readonly sortedBuildings = computed(() =>
    sortRows(this.buildings(), this._sort(), this.COLUMNS),
  );

  public onSortChange(sort: TableSort): void {
    this._sort.set(sort);
  }
}
