import { INJECTED_ANOMALIES } from '#data/anomalies.data';
import { BUILDINGS } from '#data/building.data';
import { EQUIPMENTS, findEquipment } from '#data/equipment.data';
import { type MeasurementPoint, type MeasurementSeries } from '#models/measurement.model';

import { generateMeasurementSeries, MEASUREMENT_WINDOW, selectSeriesRange } from './index';

const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const START_MS = Date.parse('2026-09-07T00:00:00.000Z');
const END_MS = Date.parse('2026-11-02T00:00:00.000Z');

function seriesOf(equipmentId: string, metric: string): MeasurementSeries {
  const equipment = findEquipment(equipmentId);
  const definition = equipment?.metrics.find((m) => m.key === metric);
  if (equipment === null || definition === undefined) {
    throw new Error(`Unknown fixture ${equipmentId}:${metric}`);
  }
  return generateMeasurementSeries(equipment, definition);
}

const ms = (point: MeasurementPoint): number => Date.parse(point.timestamp);
const dayIndex = (point: MeasurementPoint): number =>
  Math.floor((ms(point) - START_MS) / MS_DAY) % 7;
const isWeekend = (point: MeasurementPoint): boolean => dayIndex(point) >= 5;
const utcHour = (point: MeasurementPoint): number => new Date(ms(point)).getUTCHours();
const numeric = (points: readonly MeasurementPoint[]): number[] =>
  points.map((p: MeasurementPoint) => p.value ?? Number.NaN);
const sum = (values: readonly number[]): number =>
  values.reduce((a: number, b: number) => a + b, 0);
const mean = (values: readonly number[]): number => sum(values) / values.length;
const inRange = (point: MeasurementPoint, from: string, to: string): boolean =>
  ms(point) >= Date.parse(from) && ms(point) < Date.parse(to);

function longestRunOf(points: readonly MeasurementPoint[], value: number): number {
  let longest = 0;
  let current = 0;
  for (const point of points) {
    current = point.value === value ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

/** Mean value of weekday points whose UTC hour lies in [fromHour, toHour). */
function weekdayMean(series: MeasurementSeries, fromHour: number, toHour: number): number {
  return mean(
    numeric(
      series.points.filter(
        (p: MeasurementPoint) => !isWeekend(p) && utcHour(p) >= fromHour && utcHour(p) < toHour,
      ),
    ),
  );
}

/** Energy per day, keyed by day index since window start. */
function dailyEnergy(series: MeasurementSeries): Map<number, number> {
  const totals = new Map<number, number>();
  for (const point of series.points) {
    const day = Math.floor((ms(point) - START_MS) / MS_DAY);
    totals.set(day, (totals.get(day) ?? 0) + (point.value ?? 0));
  }
  return totals;
}

function meanDailyEnergy(series: MeasurementSeries, weekend: boolean): number {
  const days = [...dailyEnergy(series).entries()].filter(([day]) => day % 7 >= 5 === weekend);
  return mean(days.map(([, energy]) => energy));
}

describe('measurement generator', () => {
  describe('series shape', () => {
    it('should cover exactly the window at 15 min (5376 points) with a regular step', () => {
      const series = seriesOf('eq-paris-main-meter', 'active-energy');

      expect(series.points).toHaveLength(5376);
      expect(series.points[0]?.timestamp).toBe('2026-09-07T00:00:00.000Z');
      expect(series.points.at(-1)?.timestamp).toBe('2026-11-01T23:45:00.000Z');
      expect(series.points.every((p, i) => ms(p) === START_MS + i * 15 * MS_MINUTE)).toBe(true);
      expect(Date.parse(series.points.at(-1)?.timestamp ?? '')).toBeLessThan(END_MS);
    });

    it('should cover the window at 60 min with 1344 points', () => {
      const series = seriesOf('eq-warsaw-main-meter', 'active-energy');

      expect(series.points).toHaveLength(1344);
      expect(series.points.every((p, i) => ms(p) === START_MS + i * MS_HOUR)).toBe(true);
    });

    it('should take unit and interval from the equipment', () => {
      const lyonAhu = seriesOf('eq-lyon-ahu', 'heating-setpoint');
      const warsawMain = seriesOf('eq-warsaw-main-meter', 'active-energy');

      expect(lyonAhu).toMatchObject({
        equipmentId: 'eq-lyon-ahu',
        metric: 'heating-setpoint',
        unit: '°C',
        intervalMinutes: 60,
      });
      expect(warsawMain).toMatchObject({ unit: 'Wh', intervalMinutes: 60 });
      expect(seriesOf('eq-paris-main-meter', 'active-energy')).toMatchObject({
        unit: 'kWh',
        intervalMinutes: 15,
      });
    });

    it('should memoize the generated series per equipment and metric', () => {
      const equipment = findEquipment('eq-paris-main-meter');
      const definition = equipment?.metrics.find((m) => m.key === 'active-energy');
      if (equipment === null || definition === undefined) {
        throw new Error('fixture');
      }

      expect(generateMeasurementSeries(equipment, definition)).toBe(
        generateMeasurementSeries(equipment, definition),
      );
    });

    it('should be deterministic', () => {
      const equipment = findEquipment('eq-krakow-hvac-meter');
      const definition = equipment?.metrics[0];
      if (equipment === null || definition === undefined) {
        throw new Error('fixture');
      }

      const first = generateMeasurementSeries(equipment, definition);

      expect(first.points).toEqual(generateMeasurementSeries(equipment, definition).points);
      expect(first.points.some((p: MeasurementPoint) => (p.value ?? 0) > 0)).toBe(true);
    });

    it('should report Wh vendor values as integers', () => {
      const values = numeric(seriesOf('eq-milan-main-meter', 'active-energy').points);

      expect(values.every((v: number) => Number.isInteger(v))).toBe(true);
      expect(Math.max(...values)).toBeGreaterThan(1000);
    });

    it('should expose the data window constant', () => {
      expect(MEASUREMENT_WINDOW).toEqual({
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-11-02T00:00:00.000Z',
      });
    });

    it('should have no null value anywhere except the DQ2 gap, across the 70 equipments', () => {
      const nulls: string[] = [];
      for (const equipment of EQUIPMENTS) {
        for (const definition of equipment.metrics) {
          for (const point of generateMeasurementSeries(equipment, definition).points) {
            if (point.value === null) {
              nulls.push(`${equipment.id}@${point.timestamp}`);
            }
          }
        }
      }

      expect(nulls).toHaveLength(72);
      expect(nulls.every((n: string) => n.startsWith('eq-brussels-main-meter@'))).toBe(true);
    });
  });

  describe('nominal rhythm (Paris)', () => {
    it('should be almost empty at night and on weekends, about 65 % of capacity on weekdays at 10:00', () => {
      const capacity = BUILDINGS.find((b) => b.id === 'bld-paris')?.occupancyCapacity ?? 0;
      const occupancy = seriesOf('eq-paris-occupancy', 'occupancy-count');
      const nightOrWeekend = occupancy.points.filter(
        (p: MeasurementPoint) => isWeekend(p) || utcHour(p) < 4,
      );

      expect(Math.max(...numeric(nightOrWeekend))).toBeLessThan(capacity * 0.05);
      // 09:00Z = 10:00 local
      expect(weekdayMean(occupancy, 9, 10) / capacity).toBeGreaterThan(0.55);
      expect(weekdayMean(occupancy, 9, 10) / capacity).toBeLessThan(0.75);
    });

    it('should run HVAC weekdays from 06:00Z to 18:00Z and never on weekends', () => {
      const status = seriesOf('eq-paris-ahu', 'hvac-status').points;

      for (const point of status) {
        const expected = !isWeekend(point) && utcHour(point) >= 6 && utcHour(point) < 18 ? 1 : 0;
        if (point.value !== expected) {
          throw new Error(
            `hvac-status ${point.timestamp} = ${String(point.value)}, expected ${expected}`,
          );
        }
      }
      expect(status.some((p: MeasurementPoint) => p.value === 1)).toBe(true);
    });

    it('should hold the heating setpoint at 21', () => {
      expect(new Set(numeric(seriesOf('eq-paris-ahu', 'heating-setpoint').points))).toEqual(
        new Set([21]),
      );
    });

    it('should make the main meter match HVAC plus lighting and plugs within 10 %', () => {
      const total = (id: string): number => sum(numeric(seriesOf(id, 'active-energy').points));
      const main = total('eq-paris-main-meter');
      const parts = total('eq-paris-hvac-meter') + total('eq-paris-lighting-meter');

      expect(main).toBeGreaterThan(parts);
      expect((main - parts) / main).toBeLessThan(0.1);
    });

    it('should consume more HVAC energy per working day in October than in September', () => {
      const daily = dailyEnergy(seriesOf('eq-paris-hvac-meter', 'active-energy'));
      const weekdaysMean = (fromDay: number, toDay: number): number =>
        mean(
          [...daily.entries()]
            .filter(([d]) => d >= fromDay && d < toDay && d % 7 < 5)
            .map(([, e]) => e),
        );
      // day 0 = Sep 7; Sep 7-30 = days 0-23; Oct 5-31 = days 28-54
      expect(weekdaysMean(28, 55)).toBeGreaterThan(weekdaysMean(0, 24) * 1.15);
    });

    it('should keep a lighting and plugs night baseload around 2-3 W/m2', () => {
      const surface = BUILDINGS.find((b) => b.id === 'bld-paris')?.surfaceM2 ?? 0;
      const lighting = seriesOf('eq-paris-lighting-meter', 'active-energy');
      const nightKwhPerStep = weekdayMean(lighting, 1, 3);
      const wattsPerM2 = (nightKwhPerStep * 1000) / 0.25 / surface;

      expect(wattsPerM2).toBeGreaterThan(1.5);
      expect(wattsPerM2).toBeLessThan(3.5);
    });
  });

  describe('anomalies', () => {
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

    it('A1 Warsaw: HVAC on weekends and weekend energy around 70 % of a working day', () => {
      const status = seriesOf('eq-warsaw-ahu', 'hvac-status').points;
      const weekendNoon = status.filter((p) => isWeekend(p) && utcHour(p) >= 8 && utcHour(p) < 16);
      const weekendNight = status.filter(
        (p) => isWeekend(p) && (utcHour(p) < 6 || utcHour(p) >= 18),
      );
      const hvac = seriesOf('eq-warsaw-hvac-meter', 'active-energy');
      const ratio = meanDailyEnergy(hvac, true) / meanDailyEnergy(hvac, false);

      expect(new Set(numeric(weekendNoon))).toEqual(new Set([1]));
      expect(new Set(numeric(weekendNight))).toEqual(new Set([0]));
      expect(ratio).toBeGreaterThan(0.55);
      expect(ratio).toBeLessThan(0.85);
    });

    it('A1 Warsaw: occupancy stays near zero on weekends', () => {
      const capacity = BUILDINGS.find((b) => b.id === 'bld-warsaw')?.occupancyCapacity ?? 0;
      const weekend = seriesOf('eq-warsaw-occupancy', 'occupancy-count').points.filter(isWeekend);

      expect(Math.max(...numeric(weekend))).toBeLessThan(capacity * 0.05);
    });

    it('A2 Lyon: setpoint 23 and indoor temperature close to 23 while a healthy building stays near 21', () => {
      const setpoints = new Set(numeric(seriesOf('eq-lyon-ahu', 'heating-setpoint').points));
      const lyonTemp = weekdayMean(seriesOf('eq-lyon-temp-north', 'indoor-temperature'), 9, 15);
      const parisTemp = weekdayMean(seriesOf('eq-paris-temp-north', 'indoor-temperature'), 9, 15);

      expect(setpoints).toEqual(new Set([23]));
      expect(Math.abs(lyonTemp - 23)).toBeLessThan(1);
      expect(Math.abs(parisTemp - 21)).toBeLessThan(1);
    });

    it('A3 Madrid: night lighting and plugs power around 60 % of the day plateau', () => {
      const ratioOf = (id: string): number => {
        const series = seriesOf(id, 'active-energy');
        return weekdayMean(series, 1, 4) / weekdayMean(series, 9, 15);
      };

      expect(ratioOf('eq-madrid-lighting-meter')).toBeGreaterThan(0.5);
      expect(ratioOf('eq-madrid-lighting-meter')).toBeLessThan(0.7);
      expect(ratioOf('eq-paris-lighting-meter')).toBeLessThan(0.4);
    });

    it('A4 Berlin: HVAC on from 03:00Z (4:00 local) on working days only', () => {
      const status = seriesOf('eq-berlin-ahu', 'hvac-status').points;
      const weekday = status.filter((p) => !isWeekend(p));

      expect(new Set(numeric(weekday.filter((p) => utcHour(p) >= 3 && utcHour(p) < 18)))).toEqual(
        new Set([1]),
      );
      expect(new Set(numeric(weekday.filter((p) => utcHour(p) < 3)))).toEqual(new Set([0]));
      expect(new Set(numeric(status.filter(isWeekend)))).toEqual(new Set([0]));
    });

    it('A5 Munich: occupancy around 30 % of capacity with the same HVAC schedule as a full building', () => {
      const capacity = BUILDINGS.find((b) => b.id === 'bld-munich')?.occupancyCapacity ?? 0;
      const occupancy = seriesOf('eq-munich-occupancy', 'occupancy-count');
      const munichStatus = numeric(seriesOf('eq-munich-ahu', 'hvac-status').points);

      expect(weekdayMean(occupancy, 9, 10) / capacity).toBeGreaterThan(0.25);
      expect(weekdayMean(occupancy, 9, 10) / capacity).toBeLessThan(0.35);
      expect(munichStatus).toEqual(numeric(seriesOf('eq-paris-ahu', 'hvac-status').points));
    });

    it('DQ1 Amsterdam: north sensor exactly 21.4 from Oct 12 to Oct 17, varying outside, south sensor untouched', () => {
      const north = seriesOf('eq-amsterdam-temp-north', 'indoor-temperature').points;
      const frozen = north.filter((p) =>
        inRange(p, '2026-10-12T00:00:00.000Z', '2026-10-17T00:00:00.000Z'),
      );
      const outside = north.filter(
        (p) => !inRange(p, '2026-10-12T00:00:00.000Z', '2026-10-17T00:00:00.000Z'),
      );
      const south = numeric(
        seriesOf('eq-amsterdam-temp-south', 'indoor-temperature').points.filter((p) =>
          inRange(p, '2026-10-12T00:00:00.000Z', '2026-10-17T00:00:00.000Z'),
        ),
      );

      expect(frozen).toHaveLength(5 * 96);
      expect(new Set(numeric(frozen))).toEqual(new Set([21.4]));
      expect(new Set(numeric(outside)).size).toBeGreaterThan(50);
      expect(longestRunOf(outside, 21.4)).toBeLessThan(8);
      expect(new Set(south).size).toBeGreaterThan(10);
    });

    it('DQ2 Brussels: main meter null exactly from Oct 20 to Oct 23, values elsewhere', () => {
      const points = seriesOf('eq-brussels-main-meter', 'active-energy').points;
      const nulls = points.filter((p) => p.value === null);

      expect(nulls).toHaveLength(72);
      expect(
        nulls.every((p) => inRange(p, '2026-10-20T00:00:00.000Z', '2026-10-23T00:00:00.000Z')),
      ).toBe(true);
      expect(points.filter((p) => p.value !== null)).toHaveLength(1344 - 72);
      expect(
        seriesOf('eq-brussels-hvac-meter', 'active-energy').points.every((p) => p.value !== null),
      ).toBe(true);
    });
  });

  describe('selectSeriesRange', () => {
    const series = seriesOf('eq-paris-main-meter', 'active-energy');
    const at = (iso: string): number => Date.parse(iso);

    it('should return exactly one day (96 points) for a [from, to[ day', () => {
      const result = selectSeriesRange(
        series,
        at('2026-10-05T00:00:00.000Z'),
        at('2026-10-06T00:00:00.000Z'),
      );

      expect(result.points).toHaveLength(96);
      expect(result.points[0]?.timestamp).toBe('2026-10-05T00:00:00.000Z');
      expect(result.points.at(-1)?.timestamp).toBe('2026-10-05T23:45:00.000Z');
      expect(result).toMatchObject({
        equipmentId: series.equipmentId,
        metric: 'active-energy',
        unit: 'kWh',
      });
    });

    it('should exclude the upper bound and include the lower bound', () => {
      const result = selectSeriesRange(
        series,
        at('2026-10-05T00:00:00.000Z'),
        at('2026-10-05T00:30:00.000Z'),
      );

      expect(result.points.map((p) => p.timestamp)).toEqual([
        '2026-10-05T00:00:00.000Z',
        '2026-10-05T00:15:00.000Z',
      ]);
    });

    it('should clamp bounds to the data window', () => {
      const result = selectSeriesRange(
        series,
        at('2020-01-01T00:00:00.000Z'),
        at('2030-01-01T00:00:00.000Z'),
      );

      expect(result.points).toHaveLength(5376);
    });

    it('should return an empty series for a range fully outside the window', () => {
      expect(
        selectSeriesRange(series, at('2030-01-01T00:00:00.000Z'), at('2030-02-01T00:00:00.000Z'))
          .points,
      ).toEqual([]);
      expect(
        selectSeriesRange(series, at('2020-01-01T00:00:00.000Z'), at('2020-02-01T00:00:00.000Z'))
          .points,
      ).toEqual([]);
    });

    it('should round a from that falls between two samples up to the next sample', () => {
      const result = selectSeriesRange(
        series,
        at('2026-10-05T00:07:00.000Z'),
        at('2026-10-05T00:31:00.000Z'),
      );

      expect(result.points.map((p) => p.timestamp)).toEqual([
        '2026-10-05T00:15:00.000Z',
        '2026-10-05T00:30:00.000Z',
      ]);
    });
  });
});
