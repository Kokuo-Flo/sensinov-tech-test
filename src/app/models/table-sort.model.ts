/**
 * Sort state of the sortable tables (building list, building detail), applied by
 * `src/app/utils/table-sort.utils.ts`.
 */

/** `'asc'` = ascending, `'desc'` = descending, `''` = unsorted. */
export const SORT_DIRECTIONS = ['asc', 'desc', ''] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** A cell value a table can sort on; `null` always sorts last. */
export type SortValue = string | number | null;

/** Sorted column and direction of a table; structurally matches Angular Material's `Sort`. */
export interface TableSort {
  /** Id of the sorted column (`matColumnDef`). */
  readonly active: string;
  readonly direction: SortDirection;
}
