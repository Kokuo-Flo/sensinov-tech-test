import { type FindingKind } from '#models/finding.model';
import { makeFinding } from '#testing/fixtures';

import { FindingStatementPipe } from './finding-statement.pipe';

describe('FindingStatementPipe', () => {
  const pipe = new FindingStatementPipe();
  const statement = (kind: FindingKind, observed: number, reference: number): string =>
    pipe.transform(makeFinding({ kind, observed, reference })).replace(/\s/g, ' ');

  it('should state the weekend days with HVAC running', () => {
    expect(statement('weekend-hvac', 16, 16)).toBe('CVC en marche 16 jours de week-end sur 16, occupation quasi nulle');
  });

  it('should use the singular for a single weekend day', () => {
    expect(statement('weekend-hvac', 1, 16)).toBe('CVC en marche 1 jour de week-end sur 16, occupation quasi nulle');
  });

  it('should state the setpoint with a French decimal comma', () => {
    expect(statement('heating-setpoint', 23, 21)).toBe('Consigne médiane à 23 °C, contre 21 °C attendus');
    expect(statement('heating-setpoint', 22.5, 21)).toBe('Consigne médiane à 22,5 °C, contre 21 °C attendus');
  });

  it('should state the night power as a percentage of the day power', () => {
    expect(statement('night-baseload', 0.62, 0.2)).toBe(
      'Puissance de nuit à 62 % de celle de journée, contre 20 % pour un bâtiment sain',
    );
  });

  it('should state start and arrival as clock times', () => {
    expect(statement('early-hvac-start', 4, 8.25)).toBe('CVC démarrée vers 4 h en semaine, occupants arrivés vers 8 h 15');
    expect(statement('early-hvac-start', 5.5, 7.05)).toBe('CVC démarrée vers 5 h 30 en semaine, occupants arrivés vers 7 h 03');
  });

  it('should state the occupancy peak against its threshold', () => {
    expect(statement('low-occupancy', 0.305, 0.4)).toBe(
      "Pic d'occupation à 31 % de la capacité les jours ouvrés (seuil 40 %), CVC sur horaires pleins",
    );
  });

  it('should state the frozen run and the missing run in hours', () => {
    expect(statement('frozen-sensor', 120, 24)).toBe("Valeur identique pendant 120 h d'affilée (seuil 24 h)");
    expect(statement('missing-data', 72, 6)).toBe("Aucune valeur pendant 72 h d'affilée (seuil 6 h)");
  });
});
