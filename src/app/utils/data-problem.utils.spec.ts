import { DataProblemError } from '#models/data-problem.model';

import { invalidMetric, notFound, toDataProblem } from './data-problem.utils';

describe('toDataProblem', () => {
  it('should return the problem carried by a DataProblemError', () => {
    const problem = { type: 'not-found', title: 'Nope', detail: 'x' } as const;

    expect(toDataProblem(new DataProblemError(problem))).toEqual(problem);
  });

  it('should keep the message of another Error as detail of an unknown-error', () => {
    expect(toDataProblem(new Error('boom'))).toEqual({
      type: 'unknown-error',
      title: 'Unknown error',
      detail: 'boom',
    });
  });

  it.each([
    ['an empty Error', new Error('')],
    ['a string', 'boom'],
    ['null', null],
    ['a raw DataProblem object', { type: 'not-found', title: 'Nope' }],
  ])('should map %s to an unknown-error without detail', (_label: string, error: unknown) => {
    const result = toDataProblem(error);

    expect(result).toEqual({ type: 'unknown-error', title: 'Unknown error' });
    expect('detail' in result).toBe(false);
  });

  it('should not unwrap the cause of an Error', () => {
    const error = new Error('outer', {
      cause: new DataProblemError(notFound('Building', 'x').problem),
    });

    expect(toDataProblem(error).type).toBe('unknown-error');
  });
});

describe('notFound', () => {
  it('should build a not-found DataProblemError naming entity and id', () => {
    const error = notFound('Building', 'bld-x');

    expect(error).toBeInstanceOf(DataProblemError);
    expect(error.problem).toEqual({
      type: 'not-found',
      title: 'Building not found',
      detail: 'bld-x',
    });
  });
});

describe('invalidMetric', () => {
  it('should build an invalid-metric DataProblemError naming equipment and metric', () => {
    expect(invalidMetric('eq-1', 'hvac-status').problem).toEqual({
      type: 'invalid-metric',
      title: 'Invalid metric',
      detail: 'hvac-status is not reported by eq-1',
    });
  });
});
