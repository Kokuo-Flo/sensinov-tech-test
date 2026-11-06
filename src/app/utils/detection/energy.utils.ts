const WH_PER_KWH = 1_000;

export function whToKwh(valueWh: number): number {
  return valueWh / WH_PER_KWH;
}

/** Energy value in kWh from a vendor `unit` (`'Wh'` or `'kWh'`); any other unit is returned as is. */
export function toKwh(value: number, unit: string): number {
  return unit === 'Wh' ? whToKwh(value) : value;
}
