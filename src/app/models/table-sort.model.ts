export const SORT_DIRECTIONS = ['asc', 'desc', ''] as const;
/** `''` = unsorted. */
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Sorted column and direction of a table; structurally matches Angular Material's `Sort`. */
export interface TableSort {
  readonly active: string;
  readonly direction: SortDirection;
}

/** A cell value a table can sort on; `null` always sorts last. */
export type SortValue = string | number | null;
