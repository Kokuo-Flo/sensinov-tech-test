import { INJECTED_ANOMALIES } from '#data/anomalies.data';
import { BUILDINGS } from '#data/building.data';
import { type BuildingDetectionInput } from '#models/detection.model';
import { type Building } from '#models/building.model';
import { type Finding } from '#models/finding.model';
import {
  daysPoints,
  makeDetectionInput,
  makeDetectionSeries,
  realDetectionInput,
  weekendOffsets,
} from '#testing/detection';

import { detectBuildingFindings, excludeDoubtfulPoints } from './detect-findings.utils';

function findingsOf(buildingId: string): Finding[] {
  const building = BUILDINGS.find((candidate: Building) => candidate.id === buildingId);
  if (building === undefined) {
    throw new Error(`Unknown building ${buildingId}`);
  }
  return detectBuildingFindings(realDetectionInput(building));
}

describe('detectBuildingFindings on the generated dataset (ground truth)', () => {
  it('should find exactly the 7 injected anomalies, one per code', () => {
    const findings = BUILDINGS.flatMap((building: Building) => detectBuildingFindings(realDetectionInput(building)));

    const found = findings.map((finding: Finding) => [finding.kind, finding.buildingId]).sort();
    const injected = INJECTED_ANOMALIES.map((anomaly) => [anomaly.kind, anomaly.buildingId]).sort();

    expect(INJECTED_ANOMALIES.map((anomaly) => anomaly.code).sort()).toEqual([
      'A1', 'A2', 'A3', 'A4', 'A5', 'DQ1', 'DQ2',
    ]);
    expect(found).toEqual(injected);
  });

  it.each([
    ['bld-warsaw', 'weekend-hvac', 58_946],
    ['bld-lyon', 'heating-setpoint', 17_501],
    ['bld-madrid', 'night-baseload', 22_945],
    ['bld-berlin', 'early-hvac-start', 51_494],
    ['bld-munich', 'low-occupancy', 75_708],
  ] as const)('should find only the waste injected in %s: %s (≈ %d kWh)', (buildingId, kind, excessKwh) => {
    const findings = findingsOf(buildingId);

    expect(findings.map((finding: Finding) => finding.kind)).toEqual([kind]);
    expect(findings[0]?.excessEnergyKwh).toBeCloseTo(excessKwh, -2);
  });

  it('should find the frozen sensor on eq-amsterdam-temp-north', () => {
    const findings = findingsOf('bld-amsterdam');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'frozen-sensor:bld-amsterdam:eq-amsterdam-temp-north',
      kind: 'frozen-sensor',
      excessEnergyKwh: null,
      evidence: [{ equipmentId: 'eq-amsterdam-temp-north', metric: 'indoor-temperature' }],
    });
  });

  it('should find the missing data on eq-brussels-main-meter', () => {
    const findings = findingsOf('bld-brussels');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'missing-data:bld-brussels:eq-brussels-main-meter',
      kind: 'missing-data',
      excessEnergyKwh: null,
    });
    expect(findings[0]?.observed).toBeGreaterThanOrEqual(6);
  });

  it.each(['bld-paris', 'bld-milan', 'bld-krakow'])('should find nothing in the healthy building %s', (buildingId) => {
    expect(findingsOf(buildingId)).toEqual([]);
  });
});

describe('detectBuildingFindings', () => {
  const WEEKENDS = weekendOffsets(2);

  function weekendInput(energyAt: (hour: number, offset: number) => number): BuildingDetectionInput {
    return makeDetectionInput([
      makeDetectionSeries('hvac-status', daysPoints(WEEKENDS, (hour) => (hour >= 8 && hour < 18 ? 1 : 0)), {
        equipmentId: 'eq-ahu',
      }),
      makeDetectionSeries('occupancy-count', daysPoints(WEEKENDS, () => 0), { equipmentId: 'eq-occ' }),
      makeDetectionSeries('active-energy', daysPoints(WEEKENDS, energyAt), {
        equipmentId: 'eq-hvac-meter',
        meterScope: 'hvac',
      }),
    ]);
  }

  it('should blank frozen points before the waste rules, so a frozen meter adds no excess', () => {
    const findings = detectBuildingFindings(weekendInput(() => 2));

    expect(findings.map((finding) => finding.kind)).toEqual(['weekend-hvac', 'frozen-sensor']);
    expect(findings.find((finding) => finding.kind === 'weekend-hvac')?.excessEnergyKwh).toBe(0);
  });

  it('should keep the excess of a live meter and list waste before data-quality findings', () => {
    const findings = detectBuildingFindings(weekendInput((hour) => 1 + (hour % 5)));

    expect(findings.map((finding) => finding.kind)).toEqual(['weekend-hvac']);
    expect(findings[0]?.excessEnergyKwh).toBeGreaterThan(0);
  });

  it('should return no finding for an input without series', () => {
    expect(detectBuildingFindings(makeDetectionInput([]))).toEqual([]);
  });
});

describe('excludeDoubtfulPoints', () => {
  it('should null the frozen readings and keep the other series untouched', () => {
    const frozen = makeDetectionSeries('indoor-temperature', daysPoints([0, 1], () => 21));
    const live = makeDetectionSeries('occupancy-count', daysPoints([0, 1], (hour) => hour));
    const input = makeDetectionInput([frozen, live]);

    const cleaned = excludeDoubtfulPoints(input);

    expect(cleaned.series[0]?.points.every((point) => point.value === null)).toBe(true);
    expect(cleaned.series[1]).toBe(live);
    expect(frozen.points.every((point) => point.value === 21)).toBe(true);
  });

  it('should only blank the frozen run, not the readings around it', () => {
    const series = makeDetectionSeries(
      'indoor-temperature',
      daysPoints([0, 1, 2], (hour, offset) => (offset === 2 ? 20 + hour / 10 : 21)),
    );

    const cleaned = excludeDoubtfulPoints(makeDetectionInput([series]));

    const values = cleaned.series[0]?.points.map((point) => point.value) ?? [];
    expect(values.slice(0, 48).every((value) => value === null)).toBe(true);
    expect(values.slice(48)).toEqual(series.points.slice(48).map((point) => point.value));
  });
});
