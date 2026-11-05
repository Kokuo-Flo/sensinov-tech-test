import { Pipe, type PipeTransform } from '@angular/core';

import { type MeterScope } from '#models/equipment.model';

/** French label of a meter scope; `null` (not an energy meter) renders as « — ». */
@Pipe({ name: 'meterScopeLabel' })
export class MeterScopeLabelPipe implements PipeTransform {
  public transform(scope: MeterScope | null): string {
    switch (scope) {
      case null:
        return '—';
      case 'main':
        return 'Général';
      case 'hvac':
        return 'CVC';
      case 'lighting-plugs':
        return 'Éclairage & prises';
    }
  }
}
