/**
 * Periodic report written by an energy analyst — the client's only "advice" today. Shown on the
 * analyst report page and cross-checked against the automatic findings.
 */

/** One piece of advice from the analyst, qualitative only. */
export interface AnalystRecommendation {
  readonly id: string;
  /** Building the advice targets; `null` = applies to the whole portfolio. */
  readonly buildingId: string | null;
  readonly title: string;
  /** Free text: no figure, no estimated saving. */
  readonly description: string;
}

export interface AnalystReport {
  readonly id: string;
  readonly title: string;
  /** Analyst name. */
  readonly author: string;
  /** Publication date, ISO-8601 calendar date (`'YYYY-MM-DD'`). */
  readonly publishedAt: string;
  readonly recommendations: readonly AnalystRecommendation[];
}
