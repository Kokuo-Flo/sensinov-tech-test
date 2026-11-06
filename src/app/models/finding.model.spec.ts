import { makeFinding } from '#testing/fixtures';

import {
  type FindingKind,
  getEvidenceLink,
  getFindingCategory,
  getFindingId,
  isDataQualityFinding,
  isWasteFinding,
} from './finding.model';

describe('getFindingCategory', () => {
  it.each([
    ['weekend-hvac', 'waste'],
    ['heating-setpoint', 'waste'],
    ['night-baseload', 'waste'],
    ['early-hvac-start', 'waste'],
    ['low-occupancy', 'waste'],
    ['frozen-sensor', 'data-quality'],
    ['missing-data', 'data-quality'],
  ] as const)('should classify %s as %s', (kind: FindingKind, category: string) => {
    expect(getFindingCategory(kind)).toBe(category);
  });
});

describe('finding category guards', () => {
  it('should tell waste from data quality', () => {
    const waste = makeFinding({ kind: 'low-occupancy' });
    const quality = makeFinding({ kind: 'missing-data' });

    expect([isWasteFinding(waste), isDataQualityFinding(waste)]).toEqual([true, false]);
    expect([isWasteFinding(quality), isDataQualityFinding(quality)]).toEqual([false, true]);
  });
});

describe('getFindingId', () => {
  it('should join kind and building, and the equipment when given', () => {
    expect(getFindingId('weekend-hvac', 'bld-warsaw')).toBe('weekend-hvac:bld-warsaw');
    expect(getFindingId('frozen-sensor', 'bld-a', 'eq-1')).toBe('frozen-sensor:bld-a:eq-1');
  });
});

describe('getEvidenceLink', () => {
  it('should open the first evidence on the 8-week period', () => {
    const finding = makeFinding({
      evidence: [
        { equipmentId: 'eq-ahu', metric: 'hvac-status' },
        { equipmentId: 'eq-occ', metric: 'occupancy-count' },
      ],
    });

    expect(getEvidenceLink(finding)).toEqual({
      commands: ['/equipments', 'eq-ahu'],
      queryParams: { metric: 'hvac-status', period: '8-weeks' },
    });
  });

  it('should return null without evidence', () => {
    expect(getEvidenceLink(makeFinding({ evidence: [] }))).toBeNull();
  });
});
