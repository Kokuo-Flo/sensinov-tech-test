import { afterEach, beforeEach, type MockInstance, vi } from 'vitest';

/**
 * Global test setup: any console.warn / console.error emitted during a test fails it.
 * A test that expects console output asserts it, then calls `.mockClear()` on the spy.
 */
let warnSpy: MockInstance<typeof console.warn>;
let errorSpy: MockInstance<typeof console.error>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  const messages = [...warnSpy.mock.calls, ...errorSpy.mock.calls].map((args: unknown[]) =>
    args.map((arg: unknown) => (arg instanceof Error ? arg.message : String(arg))).join(' '),
  );
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  if (messages.length > 0) {
    throw new Error(`Unexpected console output during test:\n- ${messages.join('\n- ')}`);
  }
});
