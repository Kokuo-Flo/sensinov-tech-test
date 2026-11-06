import { DayCountPipe } from './day-count.pipe';

describe('DayCountPipe', () => {
  const pipe = new DayCountPipe();

  it('should write a French day count with the right plural', () => {
    expect(pipe.transform(1)).toBe('1 jour');
    expect(pipe.transform(40)).toBe('40 jours');
  });

  it('should write 0 in the singular', () => {
    expect(pipe.transform(0)).toBe('0 jour');
  });
});
