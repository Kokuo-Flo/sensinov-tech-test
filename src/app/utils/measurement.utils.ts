import { type MeasurementPoint } from '#models/measurement.model';

/** The `count` last points of a chronological series, most recent first. */
export function selectLatestPoints(
  points: readonly MeasurementPoint[],
  count: number,
): MeasurementPoint[] {
  if (count <= 0) {
    return [];
  }
  return points.slice(-count).reverse();
}
