import { Pipe, type PipeTransform } from '@angular/core';

const EUROS_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Amount in euros, rounded to the euro: `25027.3` → « 25 027 € ». */
@Pipe({ name: 'euros' })
export class EurosPipe implements PipeTransform {
  public transform(valueEur: number): string {
    return EUROS_FORMAT.format(valueEur);
  }
}
