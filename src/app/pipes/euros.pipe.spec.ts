import { EurosPipe } from './euros.pipe';

describe('EurosPipe', () => {
  const pipe = new EurosPipe();

  it('should round to the euro with French grouping and the € sign', () => {
    expect(pipe.transform(25_027.3).replace(/\s/g, ' ')).toBe('25 027 €');
  });

  it('should show 0 €', () => {
    expect(pipe.transform(0).replace(/\s/g, ' ')).toBe('0 €');
  });
});
