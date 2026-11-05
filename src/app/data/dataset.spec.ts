import { type Equipment } from '#models/equipment.model';

import { BUILDINGS } from './building.data';
import { EQUIPMENTS, findBuildingEquipments } from './equipment.data';

describe('dataset', () => {
  it('should expose 10 buildings and 70 equipments, 7 per building', () => {
    expect(BUILDINGS).toHaveLength(10);
    expect(EQUIPMENTS).toHaveLength(70);
    expect(new Set(EQUIPMENTS.map((e: Equipment) => e.id)).size).toBe(70);
    for (const building of BUILDINGS) {
      expect(findBuildingEquipments(building.id)).toHaveLength(7);
    }
  });

  it('should give every equipment a vendor among 4 fictional vendors', () => {
    expect(new Set(EQUIPMENTS.map((e: Equipment) => e.vendor))).toEqual(
      new Set(['Enerlog', 'Voltmark', 'AirFlux Controls', 'Sensiq']),
    );
  });

  it('should use Wh only for the Voltmark meters, kWh for Enerlog', () => {
    const energyUnits = EQUIPMENTS.filter((e: Equipment) => e.type === 'energy-meter').map(
      (e: Equipment) => `${e.vendor}:${e.metrics.map((m) => m.unit).join()}`,
    );

    expect(new Set(energyUnits)).toEqual(new Set(['Enerlog:kWh', 'Voltmark:Wh']));
  });

  it('should keep a plausible baseline intensity between 150 and 250 kWh/m2 per building', () => {
    for (const building of BUILDINGS) {
      const intensity = building.baselineAnnualEnergyKwh / building.surfaceM2;

      expect(intensity).toBeGreaterThanOrEqual(150);
      expect(intensity).toBeLessThanOrEqual(250);
    }
  });
});
