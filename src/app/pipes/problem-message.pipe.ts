import { Pipe, type PipeTransform } from '@angular/core';

import { type DataProblem } from '#models/data-problem.model';

/** French message for a data problem; `subject` names what was looked up (« Bâtiment introuvable. »). */
@Pipe({ name: 'problemMessage' })
export class ProblemMessagePipe implements PipeTransform {
  public transform(problem: DataProblem, subject = 'Élément'): string {
    switch (problem.type) {
      case 'not-found':
        return `${subject} introuvable.`;
      case 'invalid-metric':
        return "Cette métrique n'est pas disponible pour cet équipement.";
      case 'unknown-error':
        return 'Une erreur est survenue. Réessayez plus tard.';
    }
  }
}
