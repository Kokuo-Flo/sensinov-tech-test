import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import {
  MatButtonToggle,
  type MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatFormField,
  MatLabel,
  MatOption,
  MatSelect,
  type MatSelectChange,
} from '@angular/material/select';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';

import { BreadcrumbComponent } from '#components/breadcrumb/breadcrumb.component';
import { LineChartComponent } from '#components/line-chart/line-chart.component';
import { TemplateItemDirective } from '#directives/template-item.directive';
import { type BreadcrumbLink } from '#models/breadcrumb.model';
import { isMetricKey } from '#models/equipment.model';
import { LOCAL_DATE_PIPE_TIMEZONE } from '#models/local-time.model';
import { isMeasurementPeriod } from '#models/measurement-period.model';
import { EquipmentTypeLabelPipe } from '#pipes/equipment-type-label.pipe';
import { MeterScopeLabelPipe } from '#pipes/meter-scope-label.pipe';
import { MetricLabelPipe } from '#pipes/metric-label.pipe';
import { ProblemMessagePipe } from '#pipes/problem-message.pipe';

import { EquipmentDetailService } from './equipment-detail.service';

@Component({
  selector: 'sb-equipment-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatCard,
    MatCardContent,
    MatProgressBar,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
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
    BreadcrumbComponent,
    LineChartComponent,
    TemplateItemDirective,
    ProblemMessagePipe,
    EquipmentTypeLabelPipe,
    MeterScopeLabelPipe,
    MetricLabelPipe,
  ],
  providers: [EquipmentDetailService],
  templateUrl: './equipment-detail.component.html',
  styleUrl: './equipment-detail.component.scss',
})
export class EquipmentDetailComponent {
  // --- Injections ---
  private readonly _equipmentDetailService = inject(EquipmentDetailService);

  // --- Constants ---
  public readonly LATEST_POINTS_COUNT = this._equipmentDetailService.LATEST_POINTS_COUNT;
  public readonly LATEST_VALUES_COLUMNS = ['timestamp', 'value'] as const;
  /** Timestamps are shown in the buildings' local time, like the chart and the detection rules. */
  public readonly LOCAL_TIMEZONE = LOCAL_DATE_PIPE_TIMEZONE;

  // --- Inputs ---
  /** Route parameter `:equipmentId`. */
  public readonly equipmentId = input.required<string>();
  /** Optional query parameter `?metric=`: series shown first. */
  public readonly metric = input<string>();
  /** Optional query parameter `?period=`: period shown first. */
  public readonly period = input<string>();

  // --- Signals from services ---
  public readonly equipment = this._equipmentDetailService.equipment;
  public readonly isLoading = this._equipmentDetailService.isLoading;
  public readonly problem = this._equipmentDetailService.problem;
  public readonly buildingLabel = this._equipmentDetailService.buildingLabel;
  public readonly metrics = this._equipmentDetailService.metrics;
  public readonly hasSeveralMetrics = this._equipmentDetailService.hasSeveralMetrics;
  public readonly selectedMetric = this._equipmentDetailService.selectedMetric;
  public readonly selectedPeriod = this._equipmentDetailService.selectedPeriod;
  public readonly points = this._equipmentDetailService.points;
  public readonly unit = this._equipmentDetailService.unit;
  public readonly isSeriesEmpty = this._equipmentDetailService.isSeriesEmpty;
  public readonly latestPoints = this._equipmentDetailService.latestPoints;
  public readonly isSeriesLoading = this._equipmentDetailService.isSeriesLoading;
  public readonly seriesProblem = this._equipmentDetailService.seriesProblem;

  // --- Internal signals ---
  public readonly breadcrumbItems = computed<BreadcrumbLink[]>(() => {
    const root: BreadcrumbLink = {
      label: 'Bâtiments',
      routerLink: '/buildings',
      testId: 'breadcrumb-buildings',
    };
    const equipment = this.equipment();
    if (equipment === null) {
      return [root];
    }
    return [
      root,
      {
        label: this.buildingLabel(),
        routerLink: `/buildings/${equipment.buildingId}`,
        testId: 'breadcrumb-building',
      },
      { label: equipment.name, routerLink: null, testId: 'breadcrumb-equipment' },
    ];
  });
  public readonly hasSeriesValues = computed(
    () => !this.isSeriesLoading() && this.seriesProblem() === null && !this.isSeriesEmpty(),
  );

  constructor() {
    this._equipmentDetailService.connect(this.equipmentId);
    this._equipmentDetailService.connectQuery(this.metric, this.period);
  }

  public onSelectMetric(event: MatSelectChange): void {
    const value: unknown = event.value;
    if (typeof value !== 'string' || !isMetricKey(value)) {
      return;
    }
    this._equipmentDetailService.selectMetric(value);
  }

  public onSelectPeriod(event: MatButtonToggleChange): void {
    const value: unknown = event.value;
    if (typeof value !== 'string' || !isMeasurementPeriod(value)) {
      return;
    }
    this._equipmentDetailService.selectPeriod(value);
  }
}
