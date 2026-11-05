export interface AnalystRecommendation {
  readonly id: string;
  /** `null` = portfolio-wide. */
  readonly buildingId: string | null;
  readonly title: string;
  /** Free text, not quantified. */
  readonly description: string;
}

export interface AnalystReport {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  /** ISO date. */
  readonly publishedAt: string;
  readonly recommendations: readonly AnalystRecommendation[];
}
