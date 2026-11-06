/**
 * Emission reduction commitment of the client. Reference data served by `ReferenceDao.getCommitment()`, kept
 * for a future trajectory view; not displayed yet.
 */

/** Portfolio-wide target: cut emissions by `targetReductionPercent` between `baselineYear` and `targetYear`. */
export interface EmissionCommitment {
  /** Reference year of the baseline consumption, e.g. `2025`. */
  readonly baselineYear: number;
  /** Year the reduction must be reached, e.g. `2028`. */
  readonly targetYear: number;
  /** Reduction to reach, percent of baseline emissions: `30` = −30 %. */
  readonly targetReductionPercent: number;
}
