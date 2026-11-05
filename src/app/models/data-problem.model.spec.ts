import { DataProblemError } from './data-problem.model';

describe('DataProblemError', () => {
  it('should be an Error carrying its problem and name', () => {
    const problem = { type: 'not-found', title: 'Building not found', detail: 'bld-x' } as const;

    const error = new DataProblemError(problem);

    expect(error).toBeInstanceOf(Error);
    expect(error.problem).toEqual(problem);
    expect(error.name).toBe('DataProblemError');
  });

  it('should build its message as "title: detail"', () => {
    const error = new DataProblemError({ type: 'not-found', title: 'Not found', detail: 'bld-x' });

    expect(error.message).toBe('Not found: bld-x');
  });

  it('should use the title alone as message when there is no detail', () => {
    const error = new DataProblemError({ type: 'unknown-error', title: 'Unknown error' });

    expect(error.message).toBe('Unknown error');
  });
});
