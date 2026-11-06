import { type DetectionPoint } from '#models/detection.model';
import { LOCAL_UTC_OFFSET_HOURS } from '#models/local-time.model';

const MS_PER_HOUR = 3_600_000;
const LOCAL_UTC_OFFSET_MS = LOCAL_UTC_OFFSET_HOURS * MS_PER_HOUR;
const HOURS_PER_DAY = 24;
const ISO_DATE_LENGTH = 10;
const SUNDAY = 0;
const SATURDAY = 6;
/** Far above the distinct timestamps of the data window (5 376 quarter-hours); bounds the cache memory. */
const LOCAL_TIME_CACHE_MAX_SIZE = 10_000;

type LocalTime = Pick<DetectionPoint, 'localDay' | 'localHour' | 'isWeekend'>;

/**
 * Memo of {@link getLocalTime}: every series of the portfolio shares the same timestamp grid, so parsing each
 * timestamp once instead of once per point removes most of the date work of the first detection run.
 * Invisible to callers: the result only depends on the timestamp, and cached values are frozen.
 */
const LOCAL_TIME_CACHE = new Map<string, LocalTime>();

/** Local calendar position (local time: see `local-time.model.ts`) of an ISO-8601 UTC instant. */
export function getLocalTime(timestamp: string): LocalTime {
  const cached = LOCAL_TIME_CACHE.get(timestamp);
  if (cached !== undefined) {
    return cached;
  }
  if (LOCAL_TIME_CACHE.size >= LOCAL_TIME_CACHE_MAX_SIZE) {
    LOCAL_TIME_CACHE.clear();
  }
  const localTime = computeLocalTime(timestamp);
  LOCAL_TIME_CACHE.set(timestamp, localTime);
  return localTime;
}

/** Hours covered by `count` points sampled every `intervalMinutes`. */
export function toHours(count: number, intervalMinutes: number): number {
  return (count * intervalMinutes) / 60;
}

function computeLocalTime(timestamp: string): LocalTime {
  const local = new Date(Date.parse(timestamp) + LOCAL_UTC_OFFSET_MS);
  const weekday = local.getUTCDay();
  return Object.freeze({
    localDay: local.toISOString().slice(0, ISO_DATE_LENGTH),
    localHour: (local.getTime() / MS_PER_HOUR) % HOURS_PER_DAY,
    isWeekend: weekday === SATURDAY || weekday === SUNDAY,
  });
}
