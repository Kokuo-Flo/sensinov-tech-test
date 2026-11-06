import { Pipe, type PipeTransform } from '@angular/core';

import { formatDayCount } from '#utils/day-count.utils';

/** Number of days in French, singular or plural: `1` → « 1 jour », `40` → « 40 jours ». */
@Pipe({ name: 'dayCount' })
export class DayCountPipe implements PipeTransform {
  public transform(days: number): string {
    return formatDayCount(days);
  }
}
