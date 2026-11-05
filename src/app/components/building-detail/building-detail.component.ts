import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
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

import { BreadcrumbComponent } from '#components/breadcrumb/breadcrumb.component';
import { TemplateItemDirective } from '#directives/template-item.directive';
import { type BreadcrumbLink } from '#models/breadcrumb.model';
import { type TableSort } from '#models/table-sort.model';
import { EquipmentTypeLabelPipe } from '#pipes/equipment-type-label.pipe';
import { MeterScopeLabelPipe } from '#pipes/meter-scope-label.pipe';
import { ProblemMessagePipe } from '#pipes/problem-message.pipe';
import { sortRows } from '#utils/table-sort.utils';

import { BuildingDetailService } from './building-detail.service';

@Component({
  selector: 'sb-building-detail',
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
    BreadcrumbComponent,
    TemplateItemDirective,
    ProblemMessagePipe,
    EquipmentTypeLabelPipe,
    MeterScopeLabelPipe,
  ],
  providers: [BuildingDetailService],
  templateUrl: './building-detail.component.html',
})
export class BuildingDetailComponent {
  // --- Injections ---
  private readonly _buildingDetailService = inject(BuildingDetailService);

  // --- Constants ---
  public readonly COLUMNS = [
    'name',
    'type',
    'meterScope',
    'vendor',
    'zone',
    'samplingIntervalMinutes',
  ] as const;
  /** The meter scope is not sortable: most equipments have none. */
  public readonly SORTABLE_COLUMNS = [
    'name',
    'type',
    'vendor',
    'zone',
    'samplingIntervalMinutes',
  ] as const;

  // --- Inputs ---
  /** Route parameter `:buildingId`. */
  public readonly buildingId = input.required<string>();

  // --- Signals from services ---
  public readonly building = this._buildingDetailService.building;
  public readonly equipments = this._buildingDetailService.equipments;
  public readonly isLoading = this._buildingDetailService.isLoading;
  public readonly problem = this._buildingDetailService.problem;

  // --- Internal signals ---
  private readonly _sort = signal<TableSort>({ active: 'name', direction: 'asc' });

  public readonly sortedEquipments = computed(() =>
    sortRows(this.equipments(), this._sort(), this.SORTABLE_COLUMNS),
  );
  public readonly breadcrumbItems = computed<BreadcrumbLink[]>(() => {
    const root: BreadcrumbLink = {
      label: 'Bâtiments',
      routerLink: '/buildings',
      testId: 'breadcrumb-buildings',
    };
    const building = this.building();
    if (building === null) {
      return [root];
    }
    return [root, { label: building.name, routerLink: null, testId: 'breadcrumb-building' }];
  });

  constructor() {
    this._buildingDetailService.connect(this.buildingId);
  }

  public onSortChange(sort: TableSort): void {
    this._sort.set(sort);
  }
}
