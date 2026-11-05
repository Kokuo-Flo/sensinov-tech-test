import { HttpErrorResponse } from '@angular/common/http';

import { type ApiProblem, isApiProblem } from '#models/api.model';

/** Single conversion point from any thrown/emitted error to an `ApiProblem`. */
export function toApiProblem(error: unknown): ApiProblem {
  if (error instanceof HttpErrorResponse) {
    return httpErrorToApiProblem(error);
  }
  if (error instanceof Error && error.message !== '') {
    return { type: 'unknown-error', title: 'Unknown error', status: 0, detail: error.message };
  }
  return { type: 'unknown-error', title: 'Unknown error', status: 0 };
}

function httpErrorToApiProblem(error: HttpErrorResponse): ApiProblem {
  if (isApiProblem(error.error)) {
    return error.error;
  }
  if (error.status === 0) {
    return { type: 'network-error', title: 'Network error', status: 0 };
  }
  return { type: 'http-error', title: 'HTTP error', status: error.status };
}
