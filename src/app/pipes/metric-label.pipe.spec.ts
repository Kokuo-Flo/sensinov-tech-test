import { METRIC_KEYS, type MetricKey } from '#models/equipment.model';

import { MetricLabelPipe } from './metric-label.pipe';

describe('MetricLabelPipe', () => {
  const pipe = new MetricLabelPipe();
  const cases: readonly (readonly [MetricKey, string])[] = [
    ['active-energy', 'Énergie active'],
    ['hvac-status', 'État marche / arrêt'],
    ['heating-setpoint', 'Consigne de chauffage'],
    ['occupancy-count', 'Occupation'],
    ['indoor-temperature', 'Température intérieure'],
  ];

  it.each(cases)('should label %s as « %s »', (metric: MetricKey, label: string) => {
    expect(pipe.transform(metric)).toBe(label);
  });

  it('should cover every metric key', () => {
    expect(cases.map(([metric]) => metric).sort()).toEqual([...METRIC_KEYS].sort());
  });
});
