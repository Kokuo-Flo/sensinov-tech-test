import { Pipe, type PipeTransform } from '@angular/core';

import { type MetricKey } from '#models/equipment.model';

@Pipe({ name: 'metricLabel' })
export class MetricLabelPipe implements PipeTransform {
  public transform(metric: MetricKey): string {
    switch (metric) {
      case 'active-energy':
        return 'Énergie active';
      case 'hvac-status':
        return 'État marche / arrêt';
      case 'heating-setpoint':
        return 'Consigne de chauffage';
      case 'occupancy-count':
        return 'Occupation';
      case 'indoor-temperature':
        return 'Température intérieure';
    }
  }
}
