import { type Observable, firstValueFrom } from 'rxjs';

import { type DataProblem, DataProblemError } from '#models/data-problem.model';

/** Subscribes to `source` and returns the `DataProblem` of the `DataProblemError` it fails with. */
export async function problemOf(source: Observable<unknown>): Promise<DataProblem> {
  try {
    await firstValueFrom(source);
  } catch (error: unknown) {
    if (error instanceof DataProblemError) {
      return error.problem;
    }
    throw error;
  }
  throw new Error('Expected the observable to fail with a DataProblemError');
}
