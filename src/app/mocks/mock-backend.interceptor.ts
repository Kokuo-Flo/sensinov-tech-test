// THROWAWAY MOCK — fake backend, removed when a real API exists.
import {
  type HttpEvent,
  HttpErrorResponse,
  HttpHeaders,
  type HttpInterceptorFn,
  type HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { type Observable, of, switchMap, throwError, timer } from 'rxjs';

import { API_BASE_URL, type ApiProblem } from '#models/api.model';

import { MOCK_ROUTES, type MockRoute, MockProblemError } from './mock-routes';

const NETWORK_LATENCY_MS = 150;

export const mockBackendInterceptor: HttpInterceptorFn = (request, next) => {
  const url = new URL(request.urlWithParams, 'http://mock.local');
  if (!url.pathname.startsWith(`${API_BASE_URL}/`)) {
    return next(request);
  }

  // The handler runs lazily, after the simulated latency, once per subscription.
  return timer(NETWORK_LATENCY_MS).pipe(switchMap(() => answer(request, url)));
};

function answer(request: HttpRequest<unknown>, url: URL): Observable<HttpEvent<unknown>> {
  const path = url.pathname.slice(API_BASE_URL.length);
  const match = findRoute(MOCK_ROUTES, request.method, path);
  if (match === null) {
    return problemResponse(request, {
      type: 'not-found',
      title: 'No mock route',
      status: 404,
      detail: `${request.method} ${path}`,
    });
  }

  try {
    const body = match.route.handler({ params: match.params, query: url.searchParams, body: request.body });
    return of(new HttpResponse({ status: 200, statusText: 'OK', body, url: request.urlWithParams }));
  } catch (error: unknown) {
    return problemResponse(request, handlerErrorToProblem(error));
  }
}

function handlerErrorToProblem(error: unknown): ApiProblem {
  if (error instanceof MockProblemError) {
    return error.problem;
  }
  const problem: ApiProblem = { type: 'mock-handler-error', title: 'Mock handler error', status: 500 };
  return error instanceof Error ? { ...problem, detail: error.message } : problem;
}

// An interceptor must *throw* an HttpErrorResponse: an emitted non-2xx HttpResponse reaches subscribers as a success.
function problemResponse(request: HttpRequest<unknown>, problem: ApiProblem): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        status: problem.status,
        statusText: problem.title,
        error: problem,
        url: request.urlWithParams,
        headers: new HttpHeaders().set('Content-Type', 'application/problem+json'),
      }),
  );
}

interface RouteMatch {
  readonly route: MockRoute;
  readonly params: Record<string, string>;
}

function findRoute(routes: readonly MockRoute[], method: string, path: string): RouteMatch | null {
  const pathSegments = path.split('/').filter((segment: string) => segment !== '');
  for (const route of routes) {
    const params = matchPath(route.path, pathSegments);
    if (route.method === method && params !== null) {
      return { route, params };
    }
  }
  return null;
}

function matchPath(pattern: string, pathSegments: readonly string[]): Record<string, string> | null {
  const patternSegments = pattern.split('/').filter((segment: string) => segment !== '');
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }
  const params: Record<string, string> = {};
  const isMatch = patternSegments.every((patternSegment: string, index: number) => {
    const pathSegment = pathSegments[index] ?? '';
    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      return true;
    }
    return patternSegment === pathSegment;
  });
  return isMatch ? params : null;
}
