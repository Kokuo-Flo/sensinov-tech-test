import { computed, Injectable, inject, linkedSignal, type Signal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { BuildingDao } from '#dao/building.dao';
import { EquipmentDao } from '#dao/equipment.dao';
import { type DataProblem } from '#models/data-problem.model';
import { type Equipment, type MetricDefinition, type MetricKey } from '#models/equipment.model';
import {
  DEFAULT_MEASUREMENT_PERIOD,
  getMeasurementPeriodRange,
  isMeasurementPeriod,
  type MeasurementPeriod,
} from '#models/measurement-period.model';
import { toDataProblem } from '#utils/data-problem.utils';
import { selectLatestPoints } from '#utils/measurement.utils';

interface SeriesParams {
  readonly equipmentId: string;
  readonly metric: MetricKey;
  readonly from: string;
  readonly to: string;
}

/**
 * Provided by `EquipmentDetailComponent`: its state lives and dies with the page. The page hands
 * over its `equipmentId` route input once through `connect()`; every request derives from it.
 */
@Injectable()
export class EquipmentDetailService {
  // --- Injections ---
  private readonly _equipmentDao = inject(EquipmentDao);
  private readonly _buildingDao = inject(BuildingDao);

  // --- Constants ---
  public readonly LATEST_POINTS_COUNT = 48;

  // --- Internal signals ---
  private readonly _equipmentIdSource = signal<Signal<string> | null>(null);
  private readonly _equipmentId = computed(() => this._equipmentIdSource()?.() ?? null);
  private readonly _requestedMetricSource = signal<Signal<string | undefined> | null>(null);
  private readonly _requestedPeriodSource = signal<Signal<string | undefined> | null>(null);

  private readonly _equipmentResource = rxResource({
    params: () => this._equipmentId() ?? undefined,
    stream: ({ params: equipmentId }: { params: string }) =>
      this._equipmentDao.getById(equipmentId),
  });
  private readonly _buildingResource = rxResource({
    params: () => this.equipment()?.buildingId,
    stream: ({ params: buildingId }: { params: string }) => this._buildingDao.getById(buildingId),
  });
  private readonly _seriesResource = rxResource({
    params: (): SeriesParams | undefined => {
      const equipment = this.equipment();
      const metric = this._selectedMetric();
      if (equipment === null || metric === null) {
        return undefined;
      }
      const range = getMeasurementPeriodRange(this._selectedPeriod());
      return { equipmentId: equipment.id, metric, ...range };
    },
    stream: ({ params }: { params: SeriesParams }) =>
      this._equipmentDao.getMeasurements(params.equipmentId, params.metric, params.from, params.to),
  });

  /**
   * Requested metric (`?metric=`) when the equipment reports it, else its first metric, until the user
   * picks another one; reset on equipment change.
   */
  private readonly _selectedMetric = linkedSignal<MetricKey | null>(() => {
    const metrics = this.equipment()?.metrics ?? [];
    const requested = this._requestedMetricSource()?.();
    return (
      metrics.find((definition: MetricDefinition) => definition.key === requested)?.key ??
      metrics[0]?.key ??
      null
    );
  });
  /** Requested period (`?period=`) when valid, else the default one, until the user picks another one. */
  private readonly _selectedPeriod = linkedSignal<MeasurementPeriod>(() => {
    const requested = this._requestedPeriodSource()?.();
    return requested !== undefined && isMeasurementPeriod(requested)
      ? requested
      : DEFAULT_MEASUREMENT_PERIOD;
  });
  private readonly _series = computed(() =>
    this._seriesResource.hasValue() ? this._seriesResource.value() : null,
  );

  public readonly equipment = computed<Equipment | null>(() =>
    this._equipmentResource.hasValue() ? this._equipmentResource.value() : null,
  );
  public readonly isLoading: Signal<boolean> = this._equipmentResource.isLoading;
  public readonly problem = computed<DataProblem | null>(() => {
    const error = this._equipmentResource.error();
    return error === undefined ? null : toDataProblem(error);
  });

  /** Breadcrumb label: the building name is a secondary lookup, its id is shown when unavailable. */
  public readonly buildingLabel = computed(() => {
    if (this._buildingResource.hasValue()) {
      return this._buildingResource.value().name;
    }
    return this.equipment()?.buildingId ?? '';
  });

  public readonly metrics = computed(() => this.equipment()?.metrics ?? []);
  public readonly hasSeveralMetrics = computed(() => this.metrics().length > 1);
  public readonly selectedMetric = this._selectedMetric.asReadonly();
  public readonly selectedPeriod = this._selectedPeriod.asReadonly();

  public readonly points = computed(() => this._series()?.points ?? []);
  public readonly unit = computed(() => this._series()?.unit ?? '');
  public readonly isSeriesEmpty = computed(() => this.points().length === 0);
  public readonly latestPoints = computed(() =>
    selectLatestPoints(this.points(), this.LATEST_POINTS_COUNT),
  );
  public readonly isSeriesLoading: Signal<boolean> = this._seriesResource.isLoading;
  public readonly seriesProblem = computed<DataProblem | null>(() => {
    const error = this._seriesResource.error();
    return error === undefined ? null : toDataProblem(error);
  });

  public connect(equipmentId: Signal<string>): void {
    this._equipmentIdSource.set(equipmentId);
  }

  /** Optional `?metric=…&period=…` query parameters, so a link can open a given series directly. */
  public connectQuery(
    metric: Signal<string | undefined>,
    period: Signal<string | undefined>,
  ): void {
    this._requestedMetricSource.set(metric);
    this._requestedPeriodSource.set(period);
  }

  public selectMetric(metric: MetricKey): void {
    this._selectedMetric.set(metric);
  }

  public selectPeriod(period: MeasurementPeriod): void {
    this._selectedPeriod.set(period);
  }
}
