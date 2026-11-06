import { Pipe, type PipeTransform } from '@angular/core';

import { type FindingKind } from '#models/finding.model';

@Pipe({ name: 'findingKindLabel' })
export class FindingKindLabelPipe implements PipeTransform {
  public transform(kind: FindingKind): string {
    switch (kind) {
      case 'weekend-hvac':
        return 'CVC en marche le week-end';
      case 'heating-setpoint':
        return 'Consigne de chauffage trop haute';
      case 'night-baseload':
        return 'Éclairage et prises allumés la nuit';
      case 'early-hvac-start':
        return 'Démarrage trop matinal de la CVC';
      case 'low-occupancy':
        return 'Bâtiment sous-occupé';
      case 'frozen-sensor':
        return 'Capteur figé';
      case 'missing-data':
        return 'Données manquantes';
    }
  }
}
