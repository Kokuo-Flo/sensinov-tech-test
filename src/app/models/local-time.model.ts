/**
 * Local time of the buildings: one fixed offset, UTC+1 all year (no daylight-saving switch). The dataset
 * generator, the detection rules and every displayed time read the same clock, so a figure such as « CVC
 * démarrée vers 4 h » matches the times shown on the charts, whatever the browser's time zone or the season.
 */

/** Offset of local time from UTC, hours: local = UTC + 1 h. */
export const LOCAL_UTC_OFFSET_HOURS = 1;

/** Local time zone as an Angular `DatePipe` `timezone` argument (`±HHMM` offset). */
export const LOCAL_DATE_PIPE_TIMEZONE = '+0100';

/**
 * Local time zone as an `Intl.DateTimeFormat` `timeZone` option. IANA `Etc/GMT±N` zones use the POSIX sign,
 * inverted: `Etc/GMT-1` is one hour **ahead** of UTC.
 */
export const LOCAL_INTL_TIMEZONE = 'Etc/GMT-1';
