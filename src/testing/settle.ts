import { TestBed } from '@angular/core/testing';

/**
 * Runs pending effects and lets `rxResource` streams deliver. Never waits on `whenStable()`: a
 * stream that never emits (a pending request under test) would keep the app unstable forever.
 */
export async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    TestBed.tick();
    await Promise.resolve();
  }
}
