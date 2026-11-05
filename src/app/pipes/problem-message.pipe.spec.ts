import { type DataProblem } from '#models/data-problem.model';

import { ProblemMessagePipe } from './problem-message.pipe';

function problem(type: DataProblem['type']): DataProblem {
  return { type, title: 'x' };
}

describe('ProblemMessagePipe', () => {
  const pipe = new ProblemMessagePipe();

  it('should name the subject for a not-found problem', () => {
    expect(pipe.transform(problem('not-found'), 'Bâtiment')).toBe('Bâtiment introuvable.');
  });

  it('should use a generic subject by default', () => {
    expect(pipe.transform(problem('not-found'))).toBe('Élément introuvable.');
  });

  it('should explain an invalid metric', () => {
    expect(pipe.transform(problem('invalid-metric'))).toBe(
      "Cette métrique n'est pas disponible pour cet équipement.",
    );
  });

  it('should fall back to a generic message for an unknown error', () => {
    expect(pipe.transform(problem('unknown-error'))).toBe(
      'Une erreur est survenue. Réessayez plus tard.',
    );
  });
});
