import { Pipe, type PipeTransform } from '@angular/core';

import { type Confidence } from '#models/impact.model';

@Pipe({ name: 'confidenceLabel' })
export class ConfidenceLabelPipe implements PipeTransform {
  public transform(confidence: Confidence): string {
    switch (confidence) {
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Faible';
    }
  }
}
