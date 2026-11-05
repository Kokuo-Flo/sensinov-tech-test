import { findBuildingAnomaly, findSeriesDefects, INJECTED_ANOMALIES } from './anomalies.data';

describe('anomalies data', () => {
  it('should list the 7 injected anomalies A1-A5, DQ1, DQ2', () => {
    expect(INJECTED_ANOMALIES.map((a) => a.code)).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'DQ1',
      'DQ2',
    ]);
  });

  describe('findBuildingAnomaly', () => {
    it('should return the anomaly of the given kind for the building', () => {
      expect(findBuildingAnomaly('bld-lyon', 'heating-setpoint')).toMatchObject({
        code: 'A2',
        setpointCelsius: 23,
      });
      expect(findBuildingAnomaly('bld-warsaw', 'weekend-hvac')?.code).toBe('A1');
    });

    it('should return null when the building has no anomaly of that kind', () => {
      expect(findBuildingAnomaly('bld-paris', 'heating-setpoint')).toBeNull();
      expect(findBuildingAnomaly('bld-lyon', 'weekend-hvac')).toBeNull();
      expect(findBuildingAnomaly('bld-unknown', 'low-occupancy')).toBeNull();
    });
  });

  describe('findSeriesDefects', () => {
    it('should return the defects of the series', () => {
      expect(
        findSeriesDefects('eq-amsterdam-temp-north', 'indoor-temperature').map((d) => d.code),
      ).toEqual(['DQ1']);
      expect(
        findSeriesDefects('eq-brussels-main-meter', 'active-energy').map((d) => d.code),
      ).toEqual(['DQ2']);
    });

    it('should return an empty list for another metric or equipment', () => {
      expect(findSeriesDefects('eq-amsterdam-temp-north', 'active-energy')).toEqual([]);
      expect(findSeriesDefects('eq-paris-main-meter', 'active-energy')).toEqual([]);
    });
  });
});
