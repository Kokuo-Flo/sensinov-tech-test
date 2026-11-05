import { type Provider, type Type } from '@angular/core';
import { type Mock, vi } from 'vitest';

type AnyFunction = (...args: never[]) => unknown;

/** Every method of `T` replaced by a Vitest mock; non-function members keep their type. */
export type ServiceMock<T> = {
  [K in keyof T]: T[K] extends AnyFunction ? Mock<T[K]> & T[K] : T[K];
};

/**
 * Builds a mock of `token` where every prototype method is a `vi.fn()`.
 * Use `overrides` for signals, observables or fixed return values.
 */
export function createServiceMock<T>(token: Type<T>, overrides: Partial<T> = {}): ServiceMock<T> {
  const prototype = token.prototype as Record<string, unknown>;
  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name: string) => name !== 'constructor' && typeof prototype[name] === 'function',
  );
  const methods = Object.fromEntries(methodNames.map((name: string) => [name, vi.fn()]));
  return { ...methods, ...overrides } as ServiceMock<T>;
}

/** Provider registering a {@link createServiceMock} instance for `token`. */
export function provideServiceMock<T>(token: Type<T>, overrides: Partial<T> = {}): Provider {
  return { provide: token, useValue: createServiceMock(token, overrides) };
}

/** Provider list mocking several services with no overrides. */
export function provideServiceMocks(tokens: Type<unknown>[]): Provider[] {
  return tokens.map((token: Type<unknown>) => provideServiceMock(token));
}
