import { type SortValue } from '#models/table-sort.model';

import { sortRows } from './table-sort.utils';

interface Row {
  readonly id: string;
  readonly label: SortValue;
  readonly size: SortValue;
}

const COLUMNS = ['label', 'size'] as const;

function row(id: string, label: SortValue, size: SortValue = null): Row {
  return { id, label, size };
}

function ids(rows: readonly Row[]): string[] {
  return rows.map((item: Row) => item.id);
}

describe('sortRows', () => {
  const rows = [row('b', 'Bravo', 20), row('a', 'Alpha', 3), row('c', 'Charlie', 100)];

  it('should sort ascending on a text column', () => {
    const result = sortRows(rows, { active: 'label', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['a', 'b', 'c']);
  });

  it('should sort descending on a text column', () => {
    const result = sortRows(rows, { active: 'label', direction: 'desc' }, COLUMNS);

    expect(ids(result)).toEqual(['c', 'b', 'a']);
  });

  it('should sort numbers by value, not by text', () => {
    const result = sortRows(rows, { active: 'size', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['a', 'b', 'c']);
  });

  it('should sort numbers descending', () => {
    const result = sortRows(rows, { active: 'size', direction: 'desc' }, COLUMNS);

    expect(ids(result)).toEqual(['c', 'b', 'a']);
  });

  it('should use numeric collation on text containing numbers', () => {
    const numbered = [row('10', 'Étage 10'), row('2', 'Étage 2'), row('1', 'Étage 1')];

    const result = sortRows(numbered, { active: 'label', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['1', '2', '10']);
  });

  it('should ignore case and accents', () => {
    const mixed = [row('z', 'zèbre'), row('e', 'Eau'), row('e2', 'éclair')];

    const result = sortRows(mixed, { active: 'label', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['e', 'e2', 'z']);
  });

  it('should keep the original order when the direction is empty', () => {
    const result = sortRows(rows, { active: 'label', direction: '' }, COLUMNS);

    expect(ids(result)).toEqual(['b', 'a', 'c']);
  });

  it('should keep the original order for an unknown column', () => {
    const result = sortRows(rows, { active: 'unknown', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['b', 'a', 'c']);
  });

  it('should put null values last when ascending', () => {
    const withNull = [row('n', null), row('b', 'Bravo'), row('a', 'Alpha')];

    const result = sortRows(withNull, { active: 'label', direction: 'asc' }, COLUMNS);

    expect(ids(result)).toEqual(['a', 'b', 'n']);
  });

  it('should put null values last when descending', () => {
    const withNull = [row('n', null), row('b', 'Bravo'), row('a', 'Alpha')];

    const result = sortRows(withNull, { active: 'label', direction: 'desc' }, COLUMNS);

    expect(ids(result)).toEqual(['b', 'a', 'n']);
  });

  it('should return a copy and leave the input untouched', () => {
    const input = [...rows];

    const result = sortRows(input, { active: 'label', direction: 'asc' }, COLUMNS);

    expect(result).not.toBe(input);
    expect(ids(input)).toEqual(['b', 'a', 'c']);
  });

  it('should return a copy when nothing is sorted', () => {
    const result = sortRows(rows, { active: 'label', direction: '' }, COLUMNS);

    expect(result).not.toBe(rows);
    expect(result).toEqual(rows);
  });

  it('should return an empty list for no rows', () => {
    expect(sortRows([], { active: 'label', direction: 'asc' }, COLUMNS)).toEqual([]);
  });
});
