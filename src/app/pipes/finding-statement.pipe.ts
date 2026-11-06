import { Pipe, type PipeTransform } from '@angular/core';

import { type Finding } from '#models/finding.model';
import { formatDayCount } from '#utils/day-count.utils';

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const PERCENT_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });
const MINUTES_PER_HOUR = 60;

/** Figured French statement of a finding, from its `observed` / `reference` values (« CVC en marche 16 jours de week-end sur 16… »). */
@Pipe({ name: 'findingStatement' })
export class FindingStatementPipe implements PipeTransform {
  public transform(finding: Finding): string {
    const { observed, reference } = finding;
    switch (finding.kind) {
      case 'weekend-hvac':
        return `CVC en marche ${formatDayCount(observed)} de week-end sur ${reference}, occupation quasi nulle`;
      case 'heating-setpoint':
        return `Consigne médiane à ${formatNumber(observed)} °C, contre ${formatNumber(reference)} °C attendus`;
      case 'night-baseload':
        return `Puissance de nuit à ${formatPercent(observed)} de celle de journée, contre ${formatPercent(reference)} pour un bâtiment sain`;
      case 'early-hvac-start':
        return `CVC démarrée vers ${formatHourOfDay(observed)} en semaine, occupants arrivés vers ${formatHourOfDay(reference)}`;
      case 'low-occupancy':
        return `Pic d'occupation à ${formatPercent(observed)} de la capacité les jours ouvrés (seuil ${formatPercent(reference)}), CVC sur horaires pleins`;
      case 'frozen-sensor':
        return `Valeur identique pendant ${formatNumber(observed)} h d'affilée (seuil ${formatNumber(reference)} h)`;
      case 'missing-data':
        return `Aucune valeur pendant ${formatNumber(observed)} h d'affilée (seuil ${formatNumber(reference)} h)`;
    }
  }
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatPercent(ratio: number): string {
  return PERCENT_FORMAT.format(ratio);
}

/** Fractional local hour as French clock time: `4` → « 4 h », `8.25` → « 8 h 15 ». */
function formatHourOfDay(hour: number): string {
  const totalMinutes = Math.round(hour * MINUTES_PER_HOUR);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`;
}
