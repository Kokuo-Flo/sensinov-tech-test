const PLURAL_RULES = new Intl.PluralRules('fr-FR');
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** French count of days with the right plural: `1` → « 1 jour », `40` → « 40 jours » (`0` → « 0 jour »). */
export function formatDayCount(days: number): string {
  const noun = PLURAL_RULES.select(days) === 'one' ? 'jour' : 'jours';
  return `${COUNT_FORMAT.format(days)} ${noun}`;
}
