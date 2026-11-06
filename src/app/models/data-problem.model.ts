/**
 * Data access failures: raised by DAOs, stored by services as a `DataProblem | null` signal, shown by
 * the UI.
 */

/**
 * Failure categories: `'not-found'` = unknown id, `'invalid-metric'` = metric not reported by the
 * equipment, `'unknown-error'` = anything else.
 */
export const DATA_PROBLEM_TYPES = ['not-found', 'invalid-metric', 'unknown-error'] as const;

export type DataProblemType = (typeof DATA_PROBLEM_TYPES)[number];

/** Failure reported by a DAO; the UI maps `type` to a French message and never shows `title` / `detail`. */
export interface DataProblem {
  readonly type: DataProblemType;
  /** Short English summary, for logs. */
  readonly title: string;
  /** Technical detail (missing id, original error message); absent when there is none. */
  readonly detail?: string;
}

/** Error thrown by DAOs, carrying its `DataProblem` so services can recognize it with `instanceof`. */
export class DataProblemError extends Error {
  public override readonly name = 'DataProblemError';
  public readonly problem: DataProblem;

  constructor(problem: DataProblem) {
    super(problem.detail === undefined ? problem.title : `${problem.title}: ${problem.detail}`);
    this.problem = problem;
  }
}
