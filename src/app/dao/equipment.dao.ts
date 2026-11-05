import { Injectable } from '@angular/core';
import { type Observable, of, throwError } from 'rxjs';

import { findEquipment } from '#data/equipment.data';
import {
  generateMeasurementSeries,
  MEASUREMENT_WINDOW,
  selectSeriesRange,
} from '#data/measurement/index';
import { type Equipment, findMetricDefinition, type MetricKey } from '#models/equipment.model';
import { type MeasurementSeries } from '#models/measurement.model';
import { invalidMetric, notFound } from '#utils/data-problem.utils';

@Injectable({ providedIn: 'root' })
export class EquipmentDao {
  public getById(equipmentId: string): Observable<Equipment> {
    const equipment = findEquipment(equipmentId);
    if (equipment === null) {
      return throwError(() => notFound('Equipment', equipmentId));
    }
    return of(equipment);
  }

  /** `from` / `to`: optional ISO-8601 instants, `[from, to)`; they default to the data window. */
  public getMeasurements(
    equipmentId: string,
    metric: MetricKey,
    from?: string,
    to?: string,
  ): Observable<MeasurementSeries> {
    const equipment = findEquipment(equipmentId);
    if (equipment === null) {
      return throwError(() => notFound('Equipment', equipmentId));
    }
    const definition = findMetricDefinition(equipment, metric);
    if (definition === null) {
      return throwError(() => invalidMetric(equipmentId, metric));
    }
    const fromMs = Date.parse(from ?? MEASUREMENT_WINDOW.from);
    const toMs = Date.parse(to ?? MEASUREMENT_WINDOW.to);
    return of(selectSeriesRange(generateMeasurementSeries(equipment, definition), fromMs, toMs));
  }
}
