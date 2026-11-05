import { type DataProblem, DataProblemError } from '#models/data-problem.model';

/** Single conversion point from any thrown/emitted error to a `DataProblem`. */
export function toDataProblem(error: unknown): DataProblem {
  if (error instanceof DataProblemError) {
    return error.problem;
  }
  if (!(error instanceof Error) || error.message === '') {
    return { type: 'unknown-error', title: 'Unknown error' };
  }
  return { type: 'unknown-error', title: 'Unknown error', detail: error.message };
}

/** `entity` names the looked-up kind (`'Building'`), `id` the missing key. */
export function notFound(entity: string, id: string): DataProblemError {
  return new DataProblemError({ type: 'not-found', title: `${entity} not found`, detail: id });
}

export function invalidMetric(equipmentId: string, metric: string): DataProblemError {
  return new DataProblemError({
    type: 'invalid-metric',
    title: 'Invalid metric',
    detail: `${metric} is not reported by ${equipmentId}`,
  });
}
