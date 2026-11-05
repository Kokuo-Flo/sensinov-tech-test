import { type MeasurementPoint } from '#models/measurement.model';

import { selectLatestPoints } from './measurement.utils';

const point = (hour: number, value: number | null): MeasurementPoint => ({
  timestamp: `2026-10-01T${String(hour).padStart(2, '0')}:00:00.000Z`,
  value,
});

describe('selectLatestPoints', () => {
  const points = [point(0, 1), point(1, 2), point(2, null), point(3, 4)];

  it('should return the last points, most recent first', () => {
    expect(selectLatestPoints(points, 3).map((p: MeasurementPoint) => p.timestamp)).toEqual([
      '2026-10-01T03:00:00.000Z',
      '2026-10-01T02:00:00.000Z',
      '2026-10-01T01:00:00.000Z',
    ]);
  });

  it('should keep null values', () => {
    expect(selectLatestPoints(points, 2)).toEqual([point(3, 4), point(2, null)]);
  });

  it('should return the whole series reversed when it is shorter than count', () => {
    expect(selectLatestPoints(points, 10)).toEqual([...points].reverse());
  });

  it.each([0, -3])('should return an empty list for count %i', (count: number) => {
    expect(selectLatestPoints(points, count)).toEqual([]);
  });

  it('should not mutate the input', () => {
    const copy = [...points];

    selectLatestPoints(points, 4);

    expect(points).toEqual(copy);
  });

  it('should return an empty list for an empty series', () => {
    expect(selectLatestPoints([], 5)).toEqual([]);
  });
});
