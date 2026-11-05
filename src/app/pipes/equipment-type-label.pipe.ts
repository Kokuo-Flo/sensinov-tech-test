import { Pipe, type PipeTransform } from '@angular/core';

import { type EquipmentType } from '#models/equipment.model';

@Pipe({ name: 'equipmentTypeLabel' })
export class EquipmentTypeLabelPipe implements PipeTransform {
  public transform(type: EquipmentType): string {
    switch (type) {
      case 'energy-meter':
        return "Compteur d'énergie";
      case 'hvac-unit':
        return "Centrale de traitement d'air";
      case 'occupancy-sensor':
        return "Capteur d'occupation";
      case 'temperature-sensor':
        return 'Sonde de température';
    }
  }
}
