import { type Confidence } from '#models/impact.model';

import { ConfidenceLabelPipe } from './confidence-label.pipe';

describe('ConfidenceLabelPipe', () => {
  const pipe = new ConfidenceLabelPipe();

  it.each([
    ['high', 'Haute'],
    ['medium', 'Moyenne'],
    ['low', 'Faible'],
  ] as const)('should label %s as « %s »', (confidence: Confidence, label: string) => {
    expect(pipe.transform(confidence)).toBe(label);
  });
});
