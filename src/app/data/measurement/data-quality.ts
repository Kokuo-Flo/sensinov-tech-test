import { type DataQualityDefect } from '#models/injected-anomaly.model';

/** Sensor faults (DQ1–DQ2): a frozen sensor repeats one value, a silent meter sends nothing. */
export function applyDataQualityDefects(
  value: number,
  timestampMs: number,
  defects: readonly DataQualityDefect[],
): number | null {
  const defect = defects.find(
    (candidate: DataQualityDefect) =>
      timestampMs >= Date.parse(candidate.from) && timestampMs < Date.parse(candidate.to),
  );
  if (defect === undefined) {
    return value;
  }
  return defect.kind === 'frozen-sensor' ? defect.frozenValue : null;
}
