export const API_BASE_URL = '/api';

/** RFC 9457 Problem Details body returned with every non-2xx API response. */
export interface ApiProblem {
  /** Machine-readable error code (e.g. `'not-found'`, `'network-error'`); never shown raw to users. */
  readonly type: string;
  readonly title: string;
  /** HTTP status code; `0` when no response was received. */
  readonly status: number;
  readonly detail?: string;
}

export function isApiProblem(value: unknown): value is ApiProblem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('type' in value) || !('title' in value) || !('status' in value)) {
    return false;
  }
  if ('detail' in value && typeof value.detail !== 'string') {
    return false;
  }
  return typeof value.type === 'string' && typeof value.title === 'string' && Number.isInteger(value.status);
}
