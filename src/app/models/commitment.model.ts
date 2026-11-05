export interface EmissionCommitment {
  /** e.g. 2025. */
  readonly baselineYear: number;
  /** e.g. 2028. */
  readonly targetYear: number;
  /** e.g. 30 for −30 %. */
  readonly targetReductionPercent: number;
}
