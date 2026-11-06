import { Pipe, type PipeTransform } from '@angular/core';

const KG_PER_TONNE = 1_000;
/** Below this many tonnes one decimal is kept, so that a small stake does not read « 0 ». */
const DECIMAL_BELOW_TONNES = 10;
const TONNES_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const SMALL_TONNES_FORMAT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Emissions given in kgCO₂e, shown in tonnes: `252880` → « 253 tCO₂e », `5690` → « 5,7 tCO₂e ». */
@Pipe({ name: 'tonnesCo2e' })
export class TonnesCo2ePipe implements PipeTransform {
  public transform(valueKgCo2e: number): string {
    const tonnes = valueKgCo2e / KG_PER_TONNE;
    const format = Math.abs(tonnes) < DECIMAL_BELOW_TONNES ? SMALL_TONNES_FORMAT : TONNES_FORMAT;
    return `${format.format(tonnes)} tCO₂e`;
  }
}
