import { findBuildingAnomaly } from '#data/anomalies.data';
import { type SeededRandom } from '#data/utils/seeded-random';
import { type StepClock } from '#models/building-simulation.model';

import { WINDOW_DAYS } from './clock';

/** Working-day plateau occupancy as a share of capacity. */
export const NOMINAL_OCCUPANCY_RATE = 0.65;

/** Arrivals ramp up linearly over one hour. */
const ARRIVAL_START_HOUR = 8;
const ARRIVAL_END_HOUR = 9;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 14;
/** Share of the plateau still in the building during lunch. */
const LUNCH_PRESENCE_SHARE = 0.8;
/** Departures ramp down linearly over one hour. */
const DEPARTURE_START_HOUR = 18;
const DEPARTURE_END_HOUR = 19;

/** Weekend: a few people during the day (security, maintenance), almost nobody at night. */
const WEEKEND_DAYTIME_START_HOUR = 9;
const WEEKEND_DAYTIME_END_HOUR = 18;
const WEEKEND_DAY_OCCUPANCY_RATE = 0.005;
const WEEKEND_NIGHT_OCCUPANCY_RATE = 0.002;

/** Day-to-day attendance varies by ±7 % around the plateau. */
const MIN_ATTENDANCE_FACTOR = 0.93;
const MAX_ATTENDANCE_FACTOR = 1.07;

/** One attendance factor per local day (busy Tuesday, quiet Friday…). */
export function drawDailyAttendanceFactors(random: SeededRandom): number[] {
  return Array.from({ length: WINDOW_DAYS + 1 }, () =>
    random.between(MIN_ATTENDANCE_FACTOR, MAX_ATTENDANCE_FACTOR),
  );
}

/** Plateau occupancy rate of the building: 65 % of capacity, or less under a low-occupancy anomaly (A5). */
export function getPlateauOccupancyRate(buildingId: string): number {
  return findBuildingAnomaly(buildingId, 'low-occupancy')?.occupancyRate ?? NOMINAL_OCCUPANCY_RATE;
}

/** Share of the capacity present: weekday profile × plateau × daily attendance, near zero on weekends. */
export function getOccupancyRatio(
  clock: StepClock,
  plateauOccupancyRate: number,
  attendanceFactor: number,
): number {
  if (clock.isWeekend) {
    return getWeekendOccupancyRate(clock.hour);
  }
  return getWeekdayOccupancyProfile(clock.hour) * plateauOccupancyRate * attendanceFactor;
}

/** Share of the plateau on a working day: empty before 8:00, ramp 8–9, lunch dip 12–14, ramp 18–19. */
function getWeekdayOccupancyProfile(hour: number): number {
  if (hour < ARRIVAL_START_HOUR || hour >= DEPARTURE_END_HOUR) {
    return 0;
  }
  if (hour < ARRIVAL_END_HOUR) {
    return hour - ARRIVAL_START_HOUR;
  }
  if (hour >= DEPARTURE_START_HOUR) {
    return DEPARTURE_END_HOUR - hour;
  }
  return hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR ? LUNCH_PRESENCE_SHARE : 1;
}

function getWeekendOccupancyRate(hour: number): number {
  return hour >= WEEKEND_DAYTIME_START_HOUR && hour < WEEKEND_DAYTIME_END_HOUR
    ? WEEKEND_DAY_OCCUPANCY_RATE
    : WEEKEND_NIGHT_OCCUPANCY_RATE;
}
