import { type StepClock } from '#models/building-simulation.model';

/** Fixed 8-week data window, Monday to Monday, never derived from `Date.now()`. */
export const MEASUREMENT_WINDOW = {
  from: '2026-09-07T00:00:00.000Z',
  to: '2026-11-02T00:00:00.000Z',
} as const;

export const WINDOW_START_MS = Date.parse(MEASUREMENT_WINDOW.from);
export const WINDOW_END_MS = Date.parse(MEASUREMENT_WINDOW.to);

export const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1_440;
export const HOURS_PER_DAY = 24;

/** Building physics is simulated on a 15-min grid; 60-min equipments aggregate 4 steps per point. */
export const BASE_STEP_MINUTES = 15;
export const BASE_STEP_HOURS = BASE_STEP_MINUTES / MINUTES_PER_HOUR;
export const BASE_STEP_COUNT =
  (WINDOW_END_MS - WINDOW_START_MS) / (BASE_STEP_MINUTES * MS_PER_MINUTE);
/** Number of days in the window (56). */
export const WINDOW_DAYS = BASE_STEP_COUNT / (MINUTES_PER_DAY / BASE_STEP_MINUTES);

/** Daily rhythm uses local time approximated as UTC+1 (no daylight-saving switch). */
const LOCAL_UTC_OFFSET_MINUTES = 60;
const DAYS_PER_WEEK = 7;
/** The window starts on a Monday: day indexes 5 and 6 of each week are Saturday and Sunday. */
const FIRST_WEEKEND_DAY_INDEX = 5;

/** Local day, local hour and weekend flag of the `stepIndex`-th 15-min step of the window. */
export function getStepClock(stepIndex: number): StepClock {
  const localMinutes = stepIndex * BASE_STEP_MINUTES + LOCAL_UTC_OFFSET_MINUTES;
  const dayIndex = Math.floor(localMinutes / MINUTES_PER_DAY);
  return {
    dayIndex,
    hour: (localMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR,
    isWeekend: dayIndex % DAYS_PER_WEEK >= FIRST_WEEKEND_DAY_INDEX,
  };
}
