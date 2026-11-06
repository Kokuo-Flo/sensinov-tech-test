import { formatDayCount } from './day-count.utils';

describe('formatDayCount', () => {
  it('should use the singular for 0 and 1', () => {
    expect(formatDayCount(0)).toBe('0 jour');
    expect(formatDayCount(1)).toBe('1 jour');
  });

  it('should use the plural from 2', () => {
    expect(formatDayCount(2)).toBe('2 jours');
    expect(formatDayCount(40)).toBe('40 jours');
  });
});
