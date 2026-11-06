import { FINDING_KINDS, type FindingKind } from '#models/finding.model';

import { FindingKindLabelPipe } from './finding-kind-label.pipe';

describe('FindingKindLabelPipe', () => {
  const pipe = new FindingKindLabelPipe();
  const cases: readonly (readonly [FindingKind, string])[] = [
    ['weekend-hvac', 'CVC en marche le week-end'],
    ['heating-setpoint', 'Consigne de chauffage trop haute'],
    ['night-baseload', 'Éclairage et prises allumés la nuit'],
    ['early-hvac-start', 'Démarrage trop matinal de la CVC'],
    ['low-occupancy', 'Bâtiment sous-occupé'],
    ['frozen-sensor', 'Capteur figé'],
    ['missing-data', 'Données manquantes'],
  ];

  it.each(cases)('should label %s as « %s »', (kind: FindingKind, label: string) => {
    expect(pipe.transform(kind)).toBe(label);
  });

  it('should cover every finding kind', () => {
    expect(cases.map(([kind]) => kind).sort()).toEqual([...FINDING_KINDS].sort());
  });
});
