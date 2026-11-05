import { EQUIPMENT_TYPES, type EquipmentType } from '#models/equipment.model';

import { EquipmentTypeLabelPipe } from './equipment-type-label.pipe';

describe('EquipmentTypeLabelPipe', () => {
  const pipe = new EquipmentTypeLabelPipe();
  const cases: readonly (readonly [EquipmentType, string])[] = [
    ['energy-meter', "Compteur d'énergie"],
    ['hvac-unit', "Centrale de traitement d'air"],
    ['occupancy-sensor', "Capteur d'occupation"],
    ['temperature-sensor', 'Sonde de température'],
  ];

  it.each(cases)('should label %s as « %s »', (type: EquipmentType, label: string) => {
    expect(pipe.transform(type)).toBe(label);
  });

  it('should cover every equipment type', () => {
    expect(cases.map(([type]) => type).sort()).toEqual([...EQUIPMENT_TYPES].sort());
  });
});
