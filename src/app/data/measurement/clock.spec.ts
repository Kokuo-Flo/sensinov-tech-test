import { MEASUREMENT_REFERENCE_INSTANT } from '#models/measurement-period.model';

import { BASE_STEP_COUNT, getStepClock, MEASUREMENT_WINDOW, WINDOW_DAYS } from './clock';

describe('clock', () => {
  it('should span 56 days of 96 steps over the data window', () => {
    expect(WINDOW_DAYS).toBe(56);
    expect(BASE_STEP_COUNT).toBe(5376);
    expect(MEASUREMENT_WINDOW.from).toBe('2026-09-07T00:00:00.000Z');
  });

  it('should end the window on the measurement reference instant', () => {
    expect(MEASUREMENT_WINDOW.to).toBe(MEASUREMENT_REFERENCE_INSTANT);
  });

  it('should read the first step as Monday 01:00 local time (UTC+1)', () => {
    expect(getStepClock(0)).toEqual({ dayIndex: 0, hour: 1, isWeekend: false });
  });

  it('should roll over to the next local day at midnight local time (23:00Z)', () => {
    expect(getStepClock(91)).toEqual({ dayIndex: 0, hour: 23.75, isWeekend: false });
    expect(getStepClock(92)).toEqual({ dayIndex: 1, hour: 0, isWeekend: false });
  });

  it('should flag Saturday and Sunday as weekend and Monday as weekday', () => {
    const stepsPerDay = 96;

    expect(getStepClock(4 * stepsPerDay + 10).isWeekend).toBe(false);
    expect(getStepClock(5 * stepsPerDay + 10).isWeekend).toBe(true);
    expect(getStepClock(6 * stepsPerDay + 10).isWeekend).toBe(true);
    expect(getStepClock(7 * stepsPerDay + 10).isWeekend).toBe(false);
  });
});
