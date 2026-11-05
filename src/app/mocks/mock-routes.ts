// THROWAWAY MOCK — fake backend, removed when a real API exists.
import { type ApiProblem } from '#models/api.model';

export type MockMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MockRequest {
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly body: unknown;
}

export interface MockRoute {
  readonly method: MockMethod;
  /** Path relative to `API_BASE_URL`, with `:name` segments, e.g. `/buildings/:buildingId`. */
  readonly path: string;
  /** Returns the bare response payload; throws `MockProblemError` to answer an error status. */
  readonly handler: (request: MockRequest) => unknown;
}

/** Thrown by a handler to answer with `problem.status` and `problem` as Problem Details body. */
export class MockProblemError extends Error {
  public readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.detail ?? problem.title);
    this.name = 'MockProblemError';
    this.problem = problem;
  }
}

export const MOCK_ROUTES: readonly MockRoute[] = [];
