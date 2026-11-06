import { Pipe, type PipeTransform } from '@angular/core';

const KWH_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Energy in kWh, rounded to the unit: `113758.4` → « 113 758 kWh ». */
@Pipe({ name: 'kwh' })
export class KwhPipe implements PipeTransform {
  public transform(valueKwh: number): string {
    return `${KWH_FORMAT.format(valueKwh)} kWh`;
  }
}
