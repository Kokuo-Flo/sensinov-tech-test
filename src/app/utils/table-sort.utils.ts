import { type SortValue, type TableSort } from '#models/table-sort.model';

const COLLATOR = new Intl.Collator('fr-FR', { numeric: true, sensitivity: 'base' });

/**
 * Copy of `rows` sorted on `sort.active`, read as a row property. Original order when the
 * direction is empty or the column is not one of `columns`. `null` values always come last.
 */
export function sortRows<K extends string, T extends Readonly<Record<K, SortValue>>>(
  rows: readonly T[],
  sort: TableSort,
  columns: readonly K[],
): T[] {
  const column = columns.find((candidate: K) => candidate === sort.active);
  if (column === undefined || sort.direction === '') {
    return [...rows];
  }
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((left: T, right: T) =>
    compareSortValues(left[column], right[column], factor),
  );
}

function compareSortValues(left: SortValue, right: SortValue, factor: 1 | -1): number {
  if (left === null || right === null) {
    return Number(left === null) - Number(right === null);
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return factor * (left - right);
  }
  return factor * COLLATOR.compare(String(left), String(right));
}
