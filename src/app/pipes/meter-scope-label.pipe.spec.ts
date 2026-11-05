import { METER_SCOPES, type MeterScope } from '#models/equipment.model';

import { MeterScopeLabelPipe } from './meter-scope-label.pipe';

describe('MeterScopeLabelPipe', () => {
  const pipe = new MeterScopeLabelPipe();
  const cases: readonly (readonly [MeterScope, string])[] = [
    ['main', 'Général'],
    ['hvac', 'CVC'],
    ['lighting-plugs', 'Éclairage & prises'],
  ];

  it.each(cases)('should label %s as « %s »', (scope: MeterScope, label: string) => {
    expect(pipe.transform(scope)).toBe(label);
  });

  it('should cover every meter scope', () => {
    expect(cases.map(([scope]) => scope).sort()).toEqual([...METER_SCOPES].sort());
  });

  it('should render a missing scope as a dash', () => {
    expect(pipe.transform(null)).toBe('—');
  });
});
