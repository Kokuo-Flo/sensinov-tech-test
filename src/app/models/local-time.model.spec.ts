import { LOCAL_DATE_PIPE_TIMEZONE, LOCAL_INTL_TIMEZONE, LOCAL_UTC_OFFSET_HOURS } from './local-time.model';

describe('local time constants', () => {
  const instant = Date.parse('2026-09-07T03:00:00.000Z');

  it('should give the same local hour through the Intl zone as UTC plus the offset', () => {
    const format = new Intl.DateTimeFormat('en-GB', { timeZone: LOCAL_INTL_TIMEZONE, hour: '2-digit', hourCycle: 'h23' });

    expect(Number(format.format(instant))).toBe(new Date(instant).getUTCHours() + LOCAL_UTC_OFFSET_HOURS);
  });

  it('should express the same offset as the DatePipe timezone', () => {
    const sign = LOCAL_DATE_PIPE_TIMEZONE.startsWith('-') ? -1 : 1;
    const hours = Number(LOCAL_DATE_PIPE_TIMEZONE.slice(1, 3));

    expect(sign * hours).toBe(LOCAL_UTC_OFFSET_HOURS);
  });
});
